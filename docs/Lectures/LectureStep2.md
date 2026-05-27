# Step 2 - Gait(Walk/Jog) + Aim 입력 + Locomotion 스테이트 머신

Step 1 의 Idle 만 있던 캐릭터에 **이동 속도 상태 (Walk / Jog)** 와 **조준 입력 (Aim)** 을 더한다. 이동 입력이 들어오면 `LocomotionSM` 의 Cycle 상태로 전환되어 걷기 / 조깅 시퀀스를 재생하고, 마우스 우클릭을 누르면 조준 자세로 감속한다.

## 이 Step 이 적합한 프로젝트

이동 속도 모드 (Gait) 와 조준 입력 (Aim) 을 데이터 주도로 관리하고, Character ↔ AnimBP 통신을 인터페이스 메시지로 분리하는 구조. 다음 같은 프로젝트에서 효과가 크다.

### 이동 속도 모드가 2 개 이상인 게임

- **1 인칭 / 3 인칭 슈터**: 조준 시 감속, 평상시 정상 속도. "우클릭 hold = Walk, release = Jog" 매핑이 본 Step 의 패턴 그대로.
- **액션 RPG / 소울라이크**: 가드 자세, 걷기, 달리기, 스프린트 등 다단 속도 모드. enum 엔트리 + Map 키 추가만으로 확장 (`E_Gait` 에 `Sprint = 2` 추가, `GaitSettings` 맵에 새 엔트리).
- **스텔스 게임**: 걸을 때와 뛸 때 발소리 / 이동 속도 / 적 인지 거리가 게임플레이 영향을 가지는 경우. CMC 의 6 파라미터 (`MaxWalkSpeed`, `BrakingDecel` 등) 가 모드별 게임감에 직결.

### Character 와 AnimBP 의 결합도를 낮춰야 하는 프로젝트

- **모듈러 캐릭터 시스템**: 캐릭터 메시 / AnimBP 가 런타임에 교체되는 게임 (스킨 / 직업 변경 등). BPI 메시지 패턴이 핵심.
- **공용 ABP_Base + 캐릭터별 파생 ABP** 의 멀티 캐릭터 게임 (격투 게임, 히어로 슈터): Character 코드가 특정 AnimBP 클래스를 직접 알지 않아도 됨.
- 네트워크 동기화 / 리플리케이션을 고려해 메시지 채널을 명확히 분리하려는 멀티플레이 프로젝트.

### 적합하지 않은 경우

- **이동 속도가 단일** 인 게임 (보드 게임, 퍼즐 게임, 일부 어드벤처): Gait 데이터 모델 자체가 불필요.
- **AnimBP 가 캐릭터마다 완전히 분리** 되어 Character → AnimBP 직접 접근이 항상 안전한 게임: 메시지 패턴이 과도.
- 데이터 주도 설계의 학습 비용을 감수할 만큼 확장이 잦지 않은 단기 프로토타입.

### 권장 사양

| 항목 | 권장 |
|---|---|
| 시퀀스 자산 | 속도 모드 별 (Walk / Jog) 의 단일 방향 (Forward) idle / 이동 시퀀스 |
| CMC 파라미터 튜닝 | 디자이너가 `S_GaitSetting` 의 6 파라미터를 직접 조정 가능한 팀 구성 |
| 엔진 | UE 5.x (Enhanced Input + Blueprint Interface + Animation State Machine) |
| 추가 플러그인 | Enhanced Input (UE 5.0 부터 기본 포함) |
| 선행 Step | [Step 1](./LectureStep1.md) (Linked Anim Layer / ALI) |
| 후속 Step 의존성 | 단일 방향 idle / 이동만 충분하면 본 Step 까지. 4 방향 / 정지 / 출발이 필요하면 Step 3 ~ 4 |

## 결과물 한눈에

- WASD 로 이동 시 캐릭터가 걷기 / 조깅 (Gait) 에 맞는 시퀀스 재생
- 마우스 우클릭 hold = 걷기 모드, release = 조깅 모드 (조준 시 자연스러운 감속)
- 무기 전환 (Step 1) 과 Gait 전환이 함께 자연스럽게 동작
- Character → AnimBP 의 상태 변경을 인터페이스 메시지로 통지

### 이번 Step 의 신규 자산

| 자산 | 종류 | 역할 |
|---|---|---|
| `E_Gait` | UserDefinedEnum | 이동 속도 상태 (Walking = 0, Jogging = 1) |
| `S_GaitSetting` | UserDefinedStruct | 상태별 `CharacterMovementComponent` 프로파일 (6 필드) |
| `IA_Aim` | InputAction (Boolean) | 마우스 우클릭 hold 시 조준 (걷기 모드) |
| `BPI_Animation` | Blueprint Interface | Character → AnimBP 단방향 메시지 (`OnGaitChanged`) |

`ALI_Animation` 에 `CycleLayer` 함수 신규. `ABP_Base.AnimGraph` 가 단일 슬롯에서 **`LocomotionSM` 스테이트 머신** 으로 교체.

---

## 1. 중심 기능 (1) - 데이터 주도 Gait 시스템

### 1.1 E_Gait + S_GaitSetting + GaitSettings 맵

이동 속도를 코드 분기 (Branch / Switch) 가 아니라 **데이터** 로 관리한다. 새 Gait (예: Sprint) 을 추가하려면 enum 엔트리 + 맵 엔트리만 늘리면 끝.

```
E_Gait (UserDefinedEnum)
  NewEnumerator0  →  Walking  (value 0)
  NewEnumerator1  →  Jogging  (value 1)

S_GaitSetting (UserDefinedStruct, 6 필드)
  MaxWalkSpeed                 : double
  MaxAcceleration              : double
  BrakingDecelerationWalking   : double
  BrakingFrictionFactor        : double
  BrakingFriction              : double
  bUseSeparateBrakingFriction  : bool

BP_LsCharacter.GaitSettings    : Map<byte, S_GaitSetting>
                                  default:
                                    Walking : (MaxWalkSpeed=250, MaxAccel=250, BrakingDecel=250, ...)
                                    Jogging : (MaxWalkSpeed=800, MaxAccel=500, BrakingDecel=1200, ..., bUseSeparate=true)
```

6 개 값이 "한 Gait 의 무브먼트 프로파일" 이라는 하나의 의미 단위라 struct 로 묶었다. 맵으로 보관하면 `GaitSettings.Find(Gait)` 한 줄로 프로파일을 꺼낼 수 있어 분기를 안 쓴다.

### 1.2 SetGaitAndApplySettings 함수 (36 노드)

이 데이터 모델을 실제로 CMC 에 적용하는 함수. 저자 설명: "캐릭터의 이동 상태 저장 및 변경된 이동 상태에 따른 CMC 설정 변경"

```
FunctionEntry(Gait : byte)
       ↓
Branch  CurrentGait != Gait     # 가드: 상태가 실제로 바뀔 때만 진행
   │ True
   ↓
Set CurrentGait = Gait
       ↓
Message OnGaitChanged(Gait)     # BPI_Animation 메시지 송신 (Mesh -> GetAnimInstance)
       ↓
GaitSettings.Find(Gait)         # 맵에서 프로파일 꺼내기
   → Break S_GaitSetting
       ↓
CharacterMovement 에 6 파라미터 순서대로 Set:
   MaxWalkSpeed → MaxAcceleration → BrakingDecelerationWalking
   → BrakingFrictionFactor → BrakingFriction → bUseSeparateBrakingFriction
```

### 1.3 변수 가드 패턴 - 같은 상태 중복 호출 방지

**`CurrentGait != Gait` Branch 가드** 가 핵심. 입력이 매 프레임 들어와도 안전한 이유:

- 같은 Gait 로 재진입할 때 메시지 / CMC 적용을 모두 스킵
- 통지 → set → 적용 순서가 한 함수 안에 모여 있어 부분 갱신 (메시지만 보내고 CMC 미적용 같은) 가 일어나지 않음

이 가드 패턴은 다음 Step 부터도 **상태 변경 함수의 1 차 원칙** 으로 반복된다.

---

## 2. 중심 기능 (2) - IA_Aim hold 입력

### 2.1 IA_Aim 의 값 타입

```
IA_Aim  (InputAction)
  value_type           = Boolean
  consume_input        = true
  trigger_when_paused  = false
  triggers             = []
  modifiers            = []
```

Step 1 의 `IA_SwitchWeapon` 은 Axis1D (휠 한 칸 = ±1) 였지만, `IA_Aim` 은 **Boolean**. "누르는 동안 on, 떼면 off" 형태의 hold 입력에 적합한 값 타입.

키 바인딩: 마우스 우클릭.

### 2.2 두 출력 핀이 각각 다른 함수 호출

`EnhancedInputAction IA_Aim` 노드는 5 가지 출력 핀 (Started / Triggered / Ongoing / Canceled / Completed) 을 가진다. Boolean 값 타입에서는 다음 두 핀이 주로 사용된다.

- **Triggered (눌렀을 때)**: hold 가 시작되면 발화
- **Completed (뗐을 때)**: hold 가 끝나면 발화

이번 Step 은 이 두 핀을 각각 `SetGaitAndApplySettings` 에 연결한다.

```
EnhancedInputAction IA_Aim
   ├── Triggered → SetGaitAndApplySettings(Walking)    # 누르고 있는 동안: 걷기
   └── Completed → SetGaitAndApplySettings(Jogging)    # 떼면: 조깅
```

결과: 우클릭 hold 동안에는 250 cm/s 로 감속, 떼면 800 cm/s 로 가속. 조준 시 정밀 이동 / 일반 이동의 자연스러운 분리.

---

## 3. 중심 기능 (3) - Character → AnimBP 통신 (BPI_Animation)

### 3.1 BPI_Animation 인터페이스

```
BPI_Animation  (Blueprint Interface, 일반 Interface)
  parent : /Script/CoreUObject.Interface
  함수   : OnGaitChanged(NewGait : TEnumAsByte<E_Gait>)
           is_event = true, 출력 없음
```

`ABP_Base` 가 이 인터페이스를 구현하고 (`get_interfaces` 에 `BPI_Animation_C`), `Event OnGaitChanged` 노드로 수신.

### 3.2 송신 - 수신 흐름

```
BP_LsCharacter.SetGaitAndApplySettings
   ... Set CurrentGait ...
   Message OnGaitChanged(Gait)        # K2Node_Message
        대상: Get Mesh → Get Anim Instance
                       │
                       ▼  (BPI_Animation 메시지)
ABP_Base.EventGraph
   Event OnGaitChanged(NewGait)       # K2Node_Event (BPI 구현)
        ↓
   Set CurrentGait                    # ABP_Base 내부 변수에 반영
```

`BP_LsCharacter` 는 `BPI_Animation` 을 **직접 구현하지 않는다** (`get_interfaces = []`). `Message` 노드로 송신만 하고, `ABP_Base` 가 구현하고 수신한다.

### 3.3 왜 변수 공유가 아니라 메시지인가

`BP_LsCharacter` 가 `ABP_Base.CurrentGait` 를 직접 set 하려면:

- AnimBP 의 구체 클래스 (`ABP_Base_C`) 를 알아야 함
- 멀티 스레드 환경에서 직접 set 은 데이터 레이스 위험

메시지 방식의 장점:

- Character 가 AnimBP 의 타입을 몰라도 됨 (Mesh 의 AnimInstance 인터페이스만 알면 됨)
- 결합도가 낮아 무기 / 캐릭터가 바뀌어도 채널이 유지됨
- 인터페이스 함수는 thread safe 약속을 자연스럽게 따르게 됨

---

## 4. 꼭 알아야 할 기능 - BPI vs ALI

| | `ALI_Animation` (Step 1) | `BPI_Animation` (Step 2) |
|---|---|---|
| 자산 클래스 | AnimBlueprint (Animation Layer Interface) | Blueprint (일반 Interface) |
| 부모 | (Anim Layer Interface) | `/Script/CoreUObject.Interface` |
| 약속하는 것 | 포즈 슬롯 (`IdleLayer` → FPoseLink) | 이벤트 메시지 (`OnGaitChanged`) |
| 호출 방향 | AnimGraph 가 끼워진 레이어의 포즈를 평가 | 게임 코드가 AnimBP 로 상태 변경 통지 |
| 함수 출력 | `FPoseLink` (포즈) | void (이벤트만) |
| 구현체 | `ABP_Base`, `ABP_Layers` | `ABP_Base` |
| 사용 위치 | AnimGraph 의 LinkedAnimLayer 노드 | EventGraph 의 Event 노드 |

**핵심**: 둘 다 "Interface" 라는 이름이지만 역할이 다르다.

- ALI = "이 슬롯의 포즈를 만들어 주세요" (그래프 슬롯의 약속)
- BPI = "이런 이벤트가 일어났어요" (메시지 채널의 약속)

새 기능을 추가할 때 "포즈 슬롯" 인지 "이벤트 채널" 인지부터 구분.

---

## 5. 꼭 알아야 할 기능 - Message 노드

### 5.1 인터페이스 구현 없이 송신하는 방법

`Message` 노드 (`K2Node_Message`) 는 BP Interface 함수를 **인터페이스를 구현하지 않은 객체에게 송신** 할 때 쓴다. 대상 객체가 인터페이스를 구현했으면 함수가 호출되고, 안 했으면 무시된다.

이번 Step 의 사용 예:

```
Get Mesh → Get Anim Instance
        ↓
Message OnGaitChanged(Gait)
```

`Mesh.GetAnimInstance()` 가 돌려주는 객체가 무엇이든 (`ABP_Base` 인스턴스든, 다른 AnimBP 든), 그 객체가 `BPI_Animation` 을 구현했으면 `OnGaitChanged` 가 호출된다.

### 5.2 Message vs Direct Function Call

| | Message 노드 | 직접 함수 호출 |
|---|---|---|
| 대상 타입 | 인터페이스 또는 알 수 없는 타입 | 구체 타입 필수 |
| 인터페이스 미구현 시 | 무시 (안전) | 컴파일 에러 / 런타임 에러 |
| 사용 위치 | 결합도 낮춰야 할 때 | 같은 클래스 / 명확한 타입일 때 |

캐릭터가 AnimBP 와 통신할 때는 거의 항상 Message 가 답이다. 자식 ABP 가 바뀌어도, AnimBP 클래스가 교체되어도 메시지는 깨지지 않는다.

---

## 6. 꼭 알아야 할 기능 - Set Sequence with Inertial Blending

### 6.1 무엇을 하는가

Sequence Player 의 시퀀스를 **재생 중에 다른 시퀀스로 부드럽게 교체** 하는 함수. 그냥 set 하면 새 시퀀스의 0 프레임부터 시작해서 포즈가 점프하지만, 이 함수는 Inertialization 을 같이 적용해 자연스럽게 이어준다.

저자 코멘트:

> Sequence Player 의 시퀀스를 부드럽게 전환하는 함수.

### 6.2 사용 위치 (이번 Step)

`ABP_Layers.OnIdleUpdate` (9 노드) 와 `ABP_Layers.OnCycleUpdate` (13 노드) 가 같은 패턴.

```
[FunctionEntry]
   ↓
Branch (시퀀스 플레이어 유효성)
   │ True
   ↓
Convert to Sequence Player → Get SequencePlayer
   ↓
Set Sequence with Inertial Blending
   Sequence: WalkAnim / JogAnim 또는 IdleAnim
   ↓
Return
```

**OnCycleUpdate 에서의 Select**: `GetBaseAnimBP().CurrentGait` 를 보고 `WalkAnim` / `JogAnim` 중 선택해 set. 즉 같은 Cycle 상태에서도 Gait 에 따라 다른 시퀀스를 재생한다.

### 6.3 Inertialization 과의 관계

`Set Sequence with Inertial Blending` 은 [Step 1 의 Inertialization 노드](./LectureStep1.md) 와 협력한다.

- Sequence 교체 시점에 본의 현재 속도 / 가속도를 기록
- 새 시퀀스를 적용하면 포즈가 갑자기 바뀜
- 그래프 상위의 `Inertialization` 노드가 기록된 속도를 사용해 자연스럽게 보간

즉 **이 함수 자체가 블렌딩을 하지 않는다** - 블렌딩은 그래프 상위의 Inertialization 이 한다. 이 함수는 "전환이 일어났음" 을 알리는 역할.

---

## 7. ABP_Base 의 변화 - LinkedAnimLayer → LocomotionSM

### 7.1 AnimGraph 구조

```
# Step 1
LinkedAnimLayer(IdleLayer) → Inertialization → Output Pose

# Step 2
LocomotionSM (AnimGraphNode_StateMachine) → Inertialization → Output Pose
```

단일 슬롯 (`LinkedAnimLayer`) 이 사라진 게 아니라 **스테이트 머신 안으로** 들어갔다. SM 의 각 state 가 내부에서 ALI 의 대응 레이어를 호출한다.

### 7.2 LocomotionSM (2 상태)

```
   (entry)
     ↓
   [Idle] ─────────────────────────▶ [Cycle]
            Vector Length XY(CharacterVelocity2D) > 임계값
          ◀─────────────────────────
            Vector Length XY(CharacterVelocity2D) Nearly Equal 0
   cross_fade_duration = 0.2  (양방향 동일)
```

| 상태 | ALI 함수 호출 |
|---|---|
| `Idle` | `IdleLayer()` |
| `Cycle` | `CycleLayer()` (신규) |

각 state 의 내부는 정확히 2 노드 (Output Pose + Linked Anim Layer). 상태가 호출하는 ALI 함수만 바뀐다.

### 7.3 BTSUA 가 채워지기 시작

[Step 1 에서 비어 있던](./LectureStep1.md) `BlueprintThreadSafeUpdateAnimation` 이 채워진다.

```
BlueprintThreadSafeUpdateAnimation(DeltaTime)   # 2 노드
   FunctionEntry → SetVelocityData

SetVelocityData (6 노드)
   PropertyAccess (속도 읽기, 멀티스레드 안전)
      ↓
   Set CharacterVelocity (Vector)
      ↓
   vector * vector → Set CharacterVelocity2D (Vector)
```

`CharacterVelocity2D` 가 LocomotionSM 전이 룰의 입력. 매 프레임 캐싱 → 다음 프레임 SM 이 사용.

### 7.4 ABP_Base 의 신규 변수

| 변수 | 타입 | 채우는 곳 |
|---|---|---|
| `CurrentGait` | byte (E_Gait) | `Event OnGaitChanged` |
| `CharacterVelocity` | Vector | `SetVelocityData` |
| `CharacterVelocity2D` | Vector | `SetVelocityData` (전이 룰 입력) |

---

## 8. ABP_Layers 의 변화 - 시퀀스 변수 추가

| 변수 | 타입 | 연결 시퀀스 |
|---|---|---|
| `IdleAnim` | `AnimSequenceBase` | `MM_Unarmed_Idle_Ready` (Step 1 부터) |
| `WalkAnim` | `AnimSequenceBase` | `MM_Unarmed_Walk_Fwd` (신규) |
| `JogAnim` | `AnimSequenceBase` | `MM_Unarmed_Jog_Fwd` (신규) |

### 신규 함수 / 그래프

| 그래프 | 노드 수 | 역할 |
|---|---:|---|
| `OnIdleUpdate` | 9 | `IdleLayer` 슬롯 구현. `Set Sequence with Inertial Blending(IdleAnim)` |
| `OnCycleUpdate` | 13 | `CycleLayer` 슬롯 구현. `Select(CurrentGait)` → WalkAnim / JogAnim |
| `GetBaseAnimBP` | 5 | PropertyAccess → `Cast To ABP_Base` → ReturnValue. 자식 ABP 가 부모 ABP_Base 의 상태를 읽는 통로 |

`GetBaseAnimBP` 는 [Step 1 의 PropertyAccess 패턴](./LectureStep1.md) 의 두 번째 적용 예. AnimBP → 다른 AnimBP 의 변수를 읽을 때도 같은 규칙 (BlueprintPure + ReturnValue) 이 그대로 적용된다.

---

## 9. 데이터 흐름 한 장

```
키 입력 (마우스 우클릭 hold / release)
   ↓
EnhancedInputAction IA_Aim
   ↓
SetGaitAndApplySettings(Walking / Jogging)
   ├─ Branch: CurrentGait != Gait
   ├─ Set CurrentGait
   ├─ Message OnGaitChanged ─────────▶ ABP_Base.Event OnGaitChanged
   │                                         └─ Set ABP_Base.CurrentGait
   └─ CMC 6 파라미터 적용 (GaitSettings.Find)

매 프레임 (BTSUA, worker thread):
   CMC.Velocity ─ PropertyAccess ─▶ SetVelocityData
                                       └─ CharacterVelocity / 2D 캐싱
                                                ↓
                                  LocomotionSM 전이 규칙 입력
                                                ↓
                                       Idle / Cycle 결정
                                                ↓
                                ALI_Animation 의 IdleLayer / CycleLayer 평가
                                                ↓
                          ABP_Layers.OnIdleUpdate / OnCycleUpdate
                                                ↓
                IdleAnim 또는 Select[CurrentGait](WalkAnim, JogAnim)
                                                ↓
                            Set Sequence with Inertial Blending
                                                ↓
                                     Inertialization → Output Pose
```

---

## 10. 이번 Step 의 빈 슬롯 (다음 Step 에서 채울 영역)

- **방향성 없음**: Cycle 상태는 어느 방향으로 가도 같은 시퀀스 (Forward 시퀀스만 재생)
- **단일 시퀀스**: `WalkAnim` / `JogAnim` 이 각각 한 개의 AnimSequence 만 들고 있음
- **자식 ABP 미사용**: `ABP_Pistol` / `ABP_UnArmed` 가 여전히 비어 있음 (부모의 시퀀스만 사용)
- **화면 디버그 없음**: 속도 / 상태가 화면에 안 보임

다음 Step 에서 4 방향 시퀀스와 화면 디버그가 들어간다.
