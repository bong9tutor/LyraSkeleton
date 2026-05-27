# Step 1 - AnimationLayerInterface 기반 무기별 애니메이션 스위칭

`ABP_Base` 의 한 슬롯에 무기 상태별 자식 ABP 를 끼워 넣어, 게임 중에 캐릭터의 상위 바디 포즈를 통째로 갈아 끼우는 구조를 만든다. 분기 / Select 도배 없이 자식 ABP 한 장만 교체하면 캐릭터의 외형이 바뀐다.

## 이 Step 이 적합한 프로젝트

Linked Anim Layer 패턴은 "캐릭터의 상위 바디 포즈를 통째로 갈아 끼우는" 구조다. 다음 같은 프로젝트에서 효과가 크다.

### 무기 / 상태별 포즈 교체가 핵심인 게임

- **무기 종류가 3 ~ 10 종** 인 액션 게임: 권총 / 라이플 / 검 / 활 / 마법 지팡이 등 각각 다른 idle / 휴식 포즈. 무기마다 자식 ABP 한 장씩.
- **변신 / 폼 체인지 시스템**: 인간 ↔ 늑대 ↔ 다른 종족 같은 큰 형태 변화. 형태마다 상위 바디 포즈가 완전히 다른 RPG.
- **의상 / 갑옷에 따른 포즈 차이**: 가벼운 옷 (정면 idle) 과 무거운 갑옷 (어깨가 처진 idle) 처럼 의상에 따라 자세가 바뀌는 게임.
- **캐릭터마다 다른 idle / 표현** 이 필요한 멀티 캐릭터 게임 (격투 게임, 히어로 슈터). 공용 `ABP_Base` + 캐릭터별 자식 ABP.

### 인디 / 중간 규모 캐릭터 액션

- 캐릭터당 무기 분기를 한 두 줄로 처리하고 싶은 소규모 팀.
- AnimBP 작업자가 무기별로 분리되어 머지 충돌을 피해야 하는 멀티 작업 환경.
- 아직 4 방향 시퀀스 / Distance Matching 까지는 필요 없고, 정지된 캐릭터의 외형 변화만으로 충분한 게임.

### 적합하지 않은 경우

- **무기 1 ~ 2 종 + 단일 포즈** 만 필요한 작은 게임: 단순 `Switch` / `Branch` 노드만으로 충분. Linked Anim Layer 도입은 오버 엔지니어링.
- **모든 무기가 같은 idle 을 공유** 하는 게임: 자식 ABP 를 만들 동기가 없음.
- 정확한 발 미끄러짐 제거나 자연스러운 정지 거동이 필요한 단계 (그 단계는 [Step 4](./LectureStep4.md) / [Step 4.5](./LectureStep4.5.md)).

### 권장 사양

| 항목 | 권장 |
|---|---|
| 캐릭터 시퀀스 자산 | 무기 종류당 최소 1 개 idle 시퀀스 |
| 팀 사양 | AnimBP 작업자가 1 명 이상, 무기 추가가 잦은 프로젝트 |
| 엔진 | UE 5.x (Animation Layer Interface 지원) |
| 추가 플러그인 | 없음 (기본 엔진의 Enhanced Input 으로 충분) |
| 후속 Step 의존성 | 본 Step 만으로 독립 동작. 정지 / 이동 디테일이 필요해지면 Step 2 부터 누적 |

## 결과물 한눈에

- 캐릭터가 손에 든 무기에 따라 다른 Idle 포즈 (비무장 / 권총) 를 자동 적용
- 무기 전환 시 포즈가 점프하지 않고 자연스럽게 블렌딩
- 새 무기 추가 = 자식 ABP 한 개 + Switch 분기 한 줄

### 이번 Step 의 신규 자산

| 자산 | 종류 | 역할 |
|---|---|---|
| `BP_LsGameMode` | Blueprint (GameMode) | `L_Start.umap` 의 기본 GameMode. `DefaultPawnClass = BP_LsCharacter` |
| `BP_LsCharacter` | Blueprint (Character) | 메인 Pawn. 입력 / 무기 상태 / AnimBP 통신을 모두 들고 있음 |
| `ABP_Base` | Animation Blueprint | 메시의 메인 AnimBP. AnimGraph 에 Linked Anim Layer 슬롯 1 개 |
| `ABP_Layers` | Animation Blueprint | 무기별 자식 ABP 의 부모 클래스. ALI 인터페이스를 한 번 구현 |
| `ABP_Pistol` | Animation Blueprint | 권총 상태에서 끼워지는 자식 (부모 = `ABP_Layers`) |
| `ABP_UnArmed` | Animation Blueprint | 비무장 상태에서 끼워지는 자식 (부모 = `ABP_Layers`) |
| `ALI_Animation` | Animation Layer Interface | `ABP_Base` 와 자식 ABP 사이의 포즈 슬롯 약속 (`IdleLayer` 함수 1 개) |
| `E_Weapon` | UserDefinedEnum | 무기 식별 (UnArmed = 0, Pistol = 1) |
| `IMC_ALS` | InputMappingContext | Enhanced Input 매핑 컨텍스트 |
| `IA_Move`, `IA_Look`, `IA_SwitchWeapon` | InputAction | 이동 (Axis2D), 시점 (Axis2D), 무기 전환 (Axis1D) |
| `L_Start.umap` | Level | 기본 맵. 캐릭터 스폰을 검증하는 진입점 |

---

## 1. 중심 기능 - Linked Anim Layer 패턴

### 1.1 왜 이 패턴인가

캐릭터의 무기 상태가 바뀌면 상위 바디 포즈 (Idle / Aim / Walk 등) 가 함께 바뀌어야 한다. 단순한 방법은 AnimGraph 안에 `Select` / `Branch` 노드를 두고 무기 종류로 분기하는 것이다. 무기가 3 종 이상으로 늘면 다음 문제가 생긴다.

- **분기 폭발**: 무기마다 Select 입력을 추가해 그래프가 복잡해짐
- **머지 충돌**: 같은 그래프에서 여러 사람이 무기별 포즈를 동시에 작업하면 충돌
- **런타임 비용**: 사용하지 않는 무기의 그래프 가지도 평가됨 (또는 분기 비용 발생)

Linked Anim Layer 는 이 셋을 모두 해결한다.

- **베이스 그래프는 변경 없음**: `ABP_Base.AnimGraph` 안에 슬롯 한 개를 두고, 그 슬롯의 실제 구현은 외부 ABP 가 채운다.
- **자산 분리**: 무기별 자식 ABP 가 독립 자산이라 다른 무기를 건드리지 않고 작업 가능.
- **현재 끼운 자식 한 장만 평가**: 사용하지 않는 무기의 그래프는 메모리에는 있어도 매 프레임 평가되지 않음.

### 1.2 4 종 자산의 역할

```
ALI_Animation (Animation Layer Interface)
   └ 슬롯 함수: IdleLayer (inputs 없음, output: FPoseLink)

ABP_Base                        # 메인 AnimBP
   AnimGraph (3 노드):
     LinkedAnimLayer(IdleLayer)
        ↓ Pose
     Inertialization
        ↓ Pose
     Output Pose

ABP_Layers                      # 자식들의 부모 클래스
   implements ALI_Animation     # 인터페이스를 한 번 구현
   IdleLayer() 함수 → Sequence Player(MM_Unarmed_Idle_Ready)

ABP_Pistol  (parent = ABP_Layers)   # 자체 시퀀스: MM_Pistol_Idle_ADS
ABP_UnArmed (parent = ABP_Layers)   # 자체 시퀀스 없음 (부모 시퀀스 사용)
```

**핵심**: `ABP_Pistol` / `ABP_UnArmed` 는 인터페이스를 **직접 구현하지 않는다**. `ABP_Layers` 가 한 번 구현하고, 자식 ABP 들은 그것을 상속해서 필요한 부분만 override 한다. 새 무기를 추가할 때 부모를 `ABP_Layers` 로 두기만 하면 인터페이스 구현은 자동으로 따라온다.

### 1.3 ALI_Animation 인터페이스

`AnimLayerInterface` 를 부모로 하는 자산. 일반 Blueprint Interface 와 다른 점은 **함수의 출력이 `FPoseLink` (포즈)** 라는 것. 즉 "이 슬롯의 포즈를 만들어 주는 함수" 의 약속이다.

| 항목 | 값 |
|---|---|
| 함수 | `IdleLayer` |
| 입력 | 없음 |
| 출력 | `FPoseLink` (Idle 포즈) |

이 한 함수를 `ABP_Base.AnimGraph` 의 `LinkedAnimLayer` 노드가 호출하고, 자식 ABP 가 같은 함수를 구현한다.

### 1.4 런타임 동작

```
1. 캐릭터 스폰 (BeginPlay)
   → Mesh.LinkAnimClassLayers(ABP_UnArmed_C)
   → ABP_Base 의 LinkedAnimLayer 슬롯에 ABP_UnArmed 가 끼워짐

2. 매 프레임 평가
   → ABP_Base.AnimGraph 의 LinkedAnimLayer 노드가 끼워진 자식의 IdleLayer() 호출
   → 자식 (현재는 ABP_UnArmed) 이 부모 ABP_Layers 의 구현을 상속해서 IdleLayer 평가
   → Sequence Player 가 MM_Unarmed_Idle_Ready 시퀀스 재생
   → 반환된 FPoseLink 가 ABP_Base 의 Inertialization → Output Pose 로 흐름

3. 유저가 IA_SwitchWeapon (휠 스크롤) 입력
   → BP_LsCharacter.EventGraph 가 Mesh.LinkAnimClassLayers(ABP_Pistol_C) 호출
   → 같은 슬롯에 ABP_Pistol 이 새로 끼워짐
   → 다음 프레임부터 IdleLayer() 호출이 새 자식의 구현으로 라우팅
   → Inertialization 이 이전 포즈에서 새 포즈로 부드럽게 블렌딩
```

### 1.5 새 무기 추가 시나리오 (Rifle)

1. `E_Weapon` 에 `Rifle = 2` 엔트리 추가
2. `ABP_Rifle` 생성. 부모를 `ABP_Layers` 로 지정 (인터페이스 자동 상속)
3. `ABP_Rifle` 에서 필요한 시퀀스 / 그래프만 override (예: `MM_Rifle_Idle` 추가)
4. `BP_LsCharacter` 의 `Switch on Int` 에 새 case 추가, `LinkAnimClassLayers(ABP_Rifle_C)` 호출

**`ABP_Base.AnimGraph` 는 한 줄도 변경하지 않는다**. 이게 이 패턴의 학습 가치.

---

## 2. 자산 의존 체인

```
L_Start.umap
    ↓ GameMode Override
BP_LsGameMode
    ↓ DefaultPawnClass
BP_LsCharacter
    ├── 메시 → SK_Mannequin + AnimClass: ABP_Base
    ├── 추가 컴포넌트: SpringArm → Camera (3 인칭)
    ├── BeginPlay 에서 EnhancedInput Subsystem 에 IMC_ALS 등록 (Priority=0)
    ├── BeginPlay 끝에 LinkAnimClassLayers(ABP_UnArmed_C)
    └── 변수 EquippedWeapon (byte, default = UnArmed)

ABP_Base
    └── AnimGraph: LinkedAnimLayer(IdleLayer) → Inertialization → Output Pose

ABP_Layers (parent of ABP_Pistol / ABP_UnArmed)
    └── IdleLayer 구현 → Sequence Player(MM_Unarmed_Idle_Ready)

ABP_Pistol
    └── 자체 시퀀스: MM_Pistol_Idle_ADS

ABP_UnArmed
    └── 자체 시퀀스 없음 (부모 시퀀스 사용)
```

---

## 3. BP_LsCharacter 의 역할

부모는 엔진 기본 `Character`. 다음 책임을 들고 있다.

1. **입력 매핑 등록**: `BeginPlay` 에서 `EnhancedInputLocalPlayerSubsystem.AddMappingContext(IMC_ALS, Priority = 0)` 호출
2. **입력 이벤트 처리**: `EventGraph` 에 `EnhancedInputAction IA_Move / IA_Look / IA_SwitchWeapon` 노드 직접 배치
3. **현재 무기 상태 보관**: 변수 `EquippedWeapon: byte (E_Weapon)`, default `UnArmed`
4. **레이어 전환 호출**: 무기 전환 시 `Mesh.LinkAnimClassLayers(ABP_Pistol_C 또는 ABP_UnArmed_C)`

### 추가 컴포넌트 (BP 단에서 추가)

- `SpringArm` → `Camera` 2 개 (3 인칭 카메라 셋업)
- 그 외 (`CollisionCylinder`, `Arrow`, `CharMoveComp`, `CharacterMesh0`) 는 `ACharacter` 부모에서 상속된 기본 컴포넌트

---

## 4. 무기 전환 흐름

```
유저 입력 (마우스 휠 스크롤)
   IA_SwitchWeapon (Axis1D) → Started 핀 발화
        ↓
BP_LsCharacter.EventGraph
   ActionValue (double) → Truncate (int 로 변환)
        ↓
   Switch on Int
        ├── case 1: Set EquippedWeapon = UnArmed → LinkAnimClassLayers(ABP_UnArmed_C)
        ├── case 2: Set EquippedWeapon = Pistol  → LinkAnimClassLayers(ABP_Pistol_C)
        └── 그 외 (case 0 포함): 분기 없음, 무시
        ↓
ABP_Base.AnimGraph 의 LinkedAnimLayer 노드
   새로 끼워진 자식 ABP 의 IdleLayer() 평가 → 새 FPoseLink
        ↓
Inertialization
   이전 포즈 → 새 포즈로 관성을 유지한 부드러운 블렌딩
        ↓
Output Pose
```

### case 0 이 없는 이유

`IA_SwitchWeapon` 의 ActionValue 가 Axis1D 라 입력이 0 일 때도 Started 가 발화될 수 있다. case 0 을 분기하지 않음으로써 "휠을 굴렸을 때 (±1 단위) 만 무기가 전환" 되는 동작을 만든다.

---

## 5. 꼭 알아야 할 기능 - PropertyAccess

### 5.1 왜 필요한가

UE5 의 애니메이션은 **워커 스레드 (WorkerThread)** 에서 평가된다. AnimBP 의 `BlueprintThreadSafeUpdateAnimation` 이나 AnimGraph 노드 평가가 게임 스레드가 아닌 별도 스레드에서 돌기 때문에, 외부 객체 (Pawn / CMC / 다른 AnimBP) 의 멤버를 직접 읽으면 데이터 레이스가 발생할 수 있다.

PropertyAccess 는 이 문제를 해결하는 **엔진 기본 기능** 이다. AnimBP 가 외부 객체의 프로퍼티를 안전하게 캐싱해 워커 스레드에서 읽을 수 있게 해 준다.

### 5.2 활용 패턴

`ABP_Base.GetCharacterMovement` 함수가 표준 형태다.

```
[FunctionEntry: GetCharacterMovement]
       ↓
[PropertyAccess]                  # 멀티 스레드 안전한 프로퍼티 접근
       ↓ (CharacterOwner.CharacterMovement)
[DynamicCast → CharacterMovementComponent]
       ├── Success → [FunctionResult] ReturnValue
       └── Fail    → [FunctionResult] ReturnValue (None)
```

저자가 노드 코멘트로 남긴 사용 규칙 (원문):

> PropertyAccess 를 사용하는 이유는 UE5 애니메이션이 멀티 쓰레드 (WorkerThread) 로 동작하기 때문에 안정성을 위해 사용합니다.

> Outputs 변수명은 반드시 ReturnValue 로 설정 해야 AccessProperty 에 노출 됩니다. (엔진 강제)

> BlueprintPure 설정을 하고, 함수를 래핑 해서, 반환 변수명을 ReturnValue 로 지정하면, 타입이 명확한 오브젝트에서 프로퍼티 를 찾을 수 있게 되어, PropertyAccess 에 변수 노출이 가능하게 됩니다.

### 5.3 사용 시 체크리스트

1. 함수를 `BlueprintPure` 로 설정
2. 출력 변수명을 반드시 `ReturnValue` 로 지정
3. 함수 본문에 `PropertyAccess` 노드 사용 (단순 Get 대신)
4. 외부 객체의 타입이 명확해야 함 (DynamicCast 권장)

이 규칙을 지키면 AnimBP 의 다른 노드 / 그래프에서 해당 함수를 `Property Access` 로 호출할 수 있고, 워커 스레드에서 안전하게 평가된다.

### 5.4 활용 예 (이번 Step)

| 함수 | 위치 | 무엇을 안전하게 읽나 |
|---|---|---|
| `GetCharacterMovement` | `ABP_Base` | Pawn 의 `CharacterMovementComponent` |

다음 Step 부터 이 패턴이 반복된다 (`GetBaseAnimBP`, 다양한 `Set*Data` 함수의 PropertyAccess 노드 등).

---

## 6. 꼭 알아야 할 기능 - Inertialization

### 6.1 무엇을 하는가

`Inertialization` 노드는 **포즈 전환 시 이전 포즈의 관성 (속도) 을 유지하면서 새 포즈로 부드럽게 블렌딩** 한다. 이전 / 새 포즈를 단순히 가중치로 섞는 `Blend` 와 달리, 본의 회전 속도 / 위치 속도 자체를 보존해 자연스러운 전환을 만든다.

저자 코멘트 (원문):

> 이전 포즈의 이동·회전 관성을 유지하며 수행하는 고급 포즈 블렌딩

### 6.2 Blend 와 다른 점

| 노드 | 동작 | 시각 효과 |
|---|---|---|
| `Blend` / `Layered Blend per bone` | 두 포즈를 가중치로 섞음 | 본의 가속도가 갑자기 0 이 되어 살짝 뚝 끊기는 느낌 |
| `Inertialization` | 본의 속도 / 가속도를 유지하면서 새 포즈로 자연스러운 보간 | 사람 동작처럼 부드럽게 이어짐 |

특히 **빈번하게 포즈가 바뀌는 곳** (시퀀스 교체, 상태 전이, 레이어 스왑) 에서 Inertialization 이 유리.

### 6.3 어디에 두는가

`Inertialization` 노드는 AnimGraph 의 **포즈 흐름 위에 한 번** 두기만 하면 된다. 자동으로 그래프 안의 다른 노드들이 보내는 "전환 이벤트" 를 받아 동작한다.

이번 Step 의 `ABP_Base.AnimGraph` 구성:

```
LinkedAnimLayer(IdleLayer)   # 자식 ABP 의 IdleLayer 평가
       ↓
Inertialization              # 자식이 바뀔 때 자동 블렌딩
       ↓
Output Pose
```

`LinkAnimClassLayers` 가 자식 ABP 를 교체하면 슬롯의 포즈가 갑자기 새 포즈로 바뀐다. Inertialization 이 그 변화를 감지해서 부드럽게 다듬어 준다 - 즉 무기 전환 시 포즈가 점프하지 않는 이유.

### 6.4 사용 가이드

- **시퀀스 교체**: Sequence Player 의 시퀀스를 코드로 바꿀 때 (다음 Step 에서 등장하는 `Set Sequence with Inertial Blending` 함수가 같은 기법)
- **State 전이**: Animation State Machine 의 상태가 바뀔 때 (다음 Step 부터 LocomotionSM 등장)
- **레이어 스왑**: 이번 Step 처럼 `LinkAnimClassLayers` 로 자식 ABP 가 교체될 때

세 경우 모두 "이전 포즈" 와 "다음 포즈" 가 갑자기 달라지는 시점이고, Inertialization 이 그 사이를 메운다.

---

## 7. 꼭 알아야 할 기능 - Enhanced Input

### 7.1 개념

UE 5 의 표준 입력 시스템. 키 입력 → 이벤트가 다음 3 단계로 매핑된다.

| 자산 | 역할 |
|---|---|
| `InputAction` (IA) | "이동" / "시점" / "무기 전환" 같은 입력의 의미 단위. 값 타입 (Boolean / Axis1D / Axis2D / Axis3D) |
| `InputMappingContext` (IMC) | 키 ↔ IA 의 묶음. 여러 키 / 게임패드 버튼이 한 IA 를 발화하도록 묶음 |
| `EnhancedInputLocalPlayerSubsystem` | 런타임에 IMC 를 활성화 / 비활성화 |

### 7.2 이번 Step 의 입력 셋업

```
IMC_ALS  (InputMappingContext)
 ├ depends_on
 │    IA_Move          (Axis2D)
 │    IA_Look          (Axis2D)
 │    IA_SwitchWeapon  (Axis1D)
 └ referenced_by
      BP_LsCharacter
```

| InputAction | value_type | 의미 |
|---|---|---|
| `IA_Move` | Axis2D | 이동 (WASD / 게임패드 좌측 스틱) |
| `IA_Look` | Axis2D | 시점 (마우스 / 게임패드 우측 스틱) |
| `IA_SwitchWeapon` | Axis1D | 무기 전환 (마우스 휠) |

### 7.3 BP_LsCharacter 의 입력 연결

`BeginPlay` 에서 한 번 등록 후, `EventGraph` 가 각 IA 의 이벤트 노드를 받는다.

```
BeginPlay
   → GetController → CastToPlayerController
   → GetLocalPlayer → EnhancedInputLocalPlayerSubsystem
   → AddMappingContext(IMC_ALS, Priority = 0)

EventGraph (입력 처리)
   EnhancedInputAction IA_Move        → Add Movement Input (Forward / Right)
   EnhancedInputAction IA_Look        → Add Controller Yaw / Pitch Input
   EnhancedInputAction IA_SwitchWeapon → (위 무기 전환 흐름)
```

별도의 `SetupPlayerInputComponent` 함수는 없다. EventGraph 에 IA 이벤트 노드를 직접 두는 방식.

---

## 8. 이번 Step 의 빈 슬롯 (다음 Step 에서 채울 영역)

| 위치 | 현재 상태 | 다음에 채울 것 |
|---|---|---|
| `ABP_Base.BlueprintThreadSafeUpdateAnimation` | `FunctionEntry` 1 노드 (빈 함수) | 속도 / 회전 / 입력 의도 계산 |
| `ABP_Layers.OnIdleUpdate` | 비어 있음 | Idle 시퀀스 갱신 로직 |
| `ABP_Pistol / ABP_UnArmed.EventGraph` | 모든 노드 disabled | 무기 특화 동작 |
| `ABP_Base.CurrentWeapon` 변수 | 선언만 됨, set 되는 곳 없음 | Character → AnimBP 동기화 채널 |

다음 Step 부터 이 슬롯들이 채워지면서 Idle 만 있던 캐릭터가 걷고 뛰기 시작한다.
