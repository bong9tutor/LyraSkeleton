# Step 3 - 방향성 로코모션(4 방향 히스테리시스) + 뷰포트 Debug

Step 2 의 단일 방향 Cycle 위에 **4 방향 (Forward / Backward / Right / Left)** 판정을 더한다. 이동 각도를 4 개 이산 방향으로 분류하고, 각도가 경계 근처에서 떨려도 방향이 깜빡이지 않도록 히스테리시스를 적용한다. 화면 디버그로 속도 / 각도 / 방향 값을 켜고 끌 수 있다.

## 결과물 한눈에

- 캐릭터가 전 / 후 / 좌 / 우 어느 방향으로 이동해도 그에 맞는 시퀀스 재생
- 대각선 근처에서 미세하게 떨려도 방향이 핑퐁하지 않음 (히스테리시스)
- Numpad +/- 로 Global Time Dilation 을 조정해 슬로모션 확인 가능
- 화면 디버그가 데이터 (`S_DebugSetting` 의 bool) 로 켜고 꺼짐

### 이번 Step 의 신규 자산

| 자산 | 종류 | 역할 |
|---|---|---|
| `E_LocomotionDirections` | UserDefinedEnum | 이동 방향 4 엔트리 (Forward = 0, Backward = 1, Right = 2, Left = 3) |
| `S_DirectionalAnims` | UserDefinedStruct | 한 Gait 의 4 방향 시퀀스 묶음 |
| `S_DebugSetting` | UserDefinedStruct | 화면 디버그 게이트 (2 bool) |

---

## 1. 중심 기능 (1) - 4 방향 판정 + 히스테리시스

### 1.1 왜 4 방향 / 왜 히스테리시스인가

이동 시퀀스를 방향마다 다르게 재생하려면 "지금 어느 방향으로 가고 있나" 를 알아야 한다. 가장 단순한 방법은 매 프레임 각도를 4 등분하는 것이다.

```
-180 ~ -135 → Left
-135 ~  -45 → Forward 또는 Right (애매)
 -45 ~   45 → Forward
  45 ~  135 → Right
 135 ~  180 → Left
```

문제: 대각선 근처 (예: 45° 부근) 에서 각도가 미세하게 떨리면 매 프레임 Forward / Right 가 바뀌어 방향이 핑퐁한다. 시퀀스가 깜빡인다.

**히스테리시스** 가 해결한다. "한 번 결정된 방향은 더 큰 각도 변화가 있을 때만 바꾼다". 현재 방향이 Forward 면 50° 가 아니라 50 + DeadZone (예: 70°) 까지 가야 Right 로 넘어간다.

### 1.2 CalculateLocomotionDirection 함수 (ABP_Base)

7 입력 함수. 매 프레임 BTSUA 에서 호출된다.

```
CalculateLocomotionDirection(
    CurrentLocomotionAngle : double,    # 이번 프레임 각도 (-180 ~ 180)
    BackwardMin : double,
    BackwardMax : double,
    ForwardMin  : double,
    ForwardMax  : double,
    CurrentDirection : byte,            # 직전 프레임 방향 (히스테리시스 기준)
    DeadZone : double                   # 유지 영역 확장 폭
) -> ReturnValue : byte                 # E_LocomotionDirections
```

`is_pure: false`. Thread Safe.

저자 설명 (BP 안 한국어 원문):

> 이동 각도를 4 방향 (Forward/Backward/Left/Right) 중 하나로 판단합니다.
>
> [특징]
> - 히스테리시스 적용으로 경계각 깜빡임 방지
> - 데드존 파라미터로 안정성 조정 가능
> - Thread Safe 지원

### 1.3 호출 시 사용하는 임계값

BTSUA 에서 이 함수를 호출하는 노드의 핀 default 값:

| 입력 핀 | 값 | 의미 |
|---|---:|---|
| `ForwardMin` / `ForwardMax` | `-50.0` / `50.0` | 전방 판정 폭 (±50°) |
| `BackwardMin` / `BackwardMax` | `-130.0` / `130.0` | 후방 경계 (±130°) |
| `DeadZone` | `20.0` | 유지 영역 확장 폭 (°) |
| `CurrentDirection` | ← Get `LocomotionDirection` (피드백) | 직전 결과 |
| `CurrentLocomotionAngle` | ← Get `LocomotionAngle` | 이번 프레임 각도 |
| `ReturnValue` | → Set `LocomotionDirection` | 이번 프레임 방향 |

### 1.4 4 방향 분할 (DeadZone 미적용 기준)

```
  -180 │ -130        -50    0    50         130 │ 180
       │              │            │             │
  Back │◀── Left ────▶│◀── Forward ──▶│◀─ Right ─▶│ Back
 (|a|≥130)            (|a|≤50)              (50<|a|<130, 부호로 좌/우)
```

| 방향 | 각도 범위 |
|---|---|
| Forward | `-50 ~ 50` |
| Backward | `|a| ≥ 130` |
| Right | 양의 측면 (50 ~ 130 부근) |
| Left | 음의 측면 (-130 ~ -50 부근) |

### 1.5 히스테리시스 동작 - DeadZone 의 의미

함수 내부의 `Switch on E_LocomotionDirections` 노드에 저자가 단 코멘트:

> 데드존 적용: 각 방향의 유지 영역이 데드존만큼 확장되어, 한번 결정된 방향은 더 큰 각도 변화시 적용

흐름:

1. `CurrentDirection` (= 직전 프레임의 `LocomotionDirection`) 으로 **먼저 분기**
2. "지금 방향" 의 경계만 `DeadZone (20°)` 만큼 넓혀서 판정
3. 그래도 안 벗어나면 같은 방향 유지

예: 현재 Forward, 각도가 55° (Forward 의 50° 경계를 살짝 벗어남). DeadZone 20 을 더하면 Forward 의 유지 영역이 -70 ~ 70 으로 넓어진 효과 - 55° 는 여전히 Forward. 그러나 75° 가 되면 70 을 넘으므로 Right 로 전환.

**되먹임 (feedback)**: 출력 `LocomotionDirection` 이 함수 입력으로 다시 들어가는 이유. 직전 방향을 알아야 그 방향의 유지 영역을 확장할지 결정한다.

---

## 2. 중심 기능 (2) - OnCycleUpdate 의 2 단 중첩 Select

### 2.1 데이터 모델 - S_DirectionalAnims 한 struct 의 재사용

```
S_DirectionalAnims (UserDefinedStruct, 4 필드)
  Forward   : UAnimSequence*
  Backward  : UAnimSequence*
  Right     : UAnimSequence*
  Left      : UAnimSequence*
```

`ABP_Layers` 에서 이 struct 를 두 번 인스턴스화한다.

| 변수 | 타입 | 의미 |
|---|---|---|
| `WalkCycleAnims` | `S_DirectionalAnims` | 걷기의 4 방향 시퀀스 |
| `JogCycleAnims` | `S_DirectionalAnims` | 조깅의 4 방향 시퀀스 |

[Step 2 의 단일 시퀀스 변수](./LectureStep2.md) (`WalkAnim`, `JogAnim`) 가 4 방향 묶음으로 확장됐다.

### 2.2 OnCycleUpdate (17 노드) - 2 단 Select

```
CycleSequence =
   Select[ CurrentGait ](
       Walking : Select[ LocomotionDirection ]( WalkCycleAnims.F / B / R / L ),
       Jogging : Select[ LocomotionDirection ]( JogCycleAnims.F / B / R / L )
   )
→ Set Sequence with Inertial Blending
```

핀 배선 (실측):

```
# 안쪽 Select (방향 분기) x 2
Select_2.Index ← LocomotionDirection
  NewEnumerator0 ← WalkCycleAnims.Forward
  NewEnumerator1 ← WalkCycleAnims.Backward
  NewEnumerator2 ← WalkCycleAnims.Right
  NewEnumerator3 ← WalkCycleAnims.Left

Select_1.Index ← LocomotionDirection
  NewEnumerator0..3 ← JogCycleAnims.{Forward / Backward / Right / Left}

# 바깥쪽 Select (Gait 분기)
Select_0.Index ← CurrentGait
  NewEnumerator0 (Walking) ← Select_2.ReturnValue
  NewEnumerator1 (Jogging) ← Select_1.ReturnValue
  ReturnValue → Set Sequence with Inertial Blending
```

### 2.3 enum 값 순서 = Select 인덱스

이 구조가 동작하는 이유: enum 값 (0~3) 이 그대로 Select 인덱스가 되도록 설계됐다.

| E_LocomotionDirections | 값 | Select 핀 이름 | S_DirectionalAnims 필드 |
|---|---|---|---|
| Forward | 0 | NewEnumerator0 | Forward |
| Backward | 1 | NewEnumerator1 | Backward |
| Right | 2 | NewEnumerator2 | Right |
| Left | 3 | NewEnumerator3 | Left |

**경고**: enum 엔트리 순서를 바꾸면 방향 매핑이 어긋난다. 새 방향을 끝에 추가하는 건 안전하지만 중간에 삽입 / 재정렬은 금지.

### 2.4 이산 선택인데 왜 끊기지 않나

Select 는 4 칸 이산 스위치라 방향이 F → R 로 튀는 순간 시퀀스가 갑자기 바뀐다. 그런데 화면에서는 끊겨 보이지 않는다. 두 곳에서 부드러움이 만들어진다.

- `Set Sequence with Inertial Blending` ([Step 2 참고](./LectureStep2.md))
- `ABP_Base.AnimGraph` 의 `Inertialization` ([Step 1 참고](./LectureStep1.md))

**이산 선택 + 관성 블렌딩** 이 저자의 의도.

---

## 3. ABP_Base 의 5 단 파이프라인

`BlueprintThreadSafeUpdateAnimation(DeltaTime)` 가 [Step 2 의 1 단](./LectureStep2.md) (`SetVelocityData`) 에서 **5 단** 으로 늘었다.

```
FunctionEntry
  → SetVelocityData         # Step 2: CharacterVelocity / 2D
  → SetLocationData         # Step 3: WorldLocation
  → SetRotationData         # Step 3: WorldRotation
  → UpdateOrientationData   # Step 3: LocomotionAngle 산출
  → CalculateLocomotionDirection   # Step 3: 각도 → 4 방향 enum
  → Set LocomotionDirection
```

### 3.1 SetLocationData / SetRotationData (각 3 노드)

군더더기 없는 캐시 함수. 둘 다 같은 모양.

```
FunctionEntry → PropertyAccess → Set WorldLocation     # 또는 Set WorldRotation
```

저자 설명: "캐릭터의 현재 위치 / 회전 정보를 각 변수에 설정".

### 3.2 UpdateOrientationData (5 노드) - 각도 산출

```
FunctionEntry → Set LocomotionAngle
   ▲
   └── Calculate Direction(
           Velocity     = Get CharacterVelocity2D,
           BaseRotation = Get WorldRotation )
```

`Calculate Direction` 은 엔진 표준 노드 (`UKismetAnimationLibrary::CalculateDirection`). 속도 벡터를 기준 회전으로 투영해 **-180 ~ 180 도** 의 상대 이동 각도를 돌려준다.

### 3.3 ABP_Base 의 신규 변수 (카테고리 신설)

| 변수 | 타입 | category |
|---|---|---|
| `WorldLocation` | Vector | LocationData (신설) |
| `WorldRotation` | Rotator | RotationData (신설) |
| `LocomotionAngle` | real | LocomotionData (신설) |
| `LocomotionDirection` | byte (E_LocomotionDirections) | LocomotionData |
| `DebugSettings` | struct (S_DebugSetting) | Debug (신설) |

매 프레임 worker thread 에서 채워지는 캐싱 변수. instance editable 한 튜닝 노브가 아니다.

---

## 4. 꼭 알아야 할 기능 - Calculate Direction (엔진 함수)

### 4.1 무엇을 하나

`UKismetAnimationLibrary::CalculateDirection`. AnimBP 분석의 핵심 엔진 노드 중 하나.

| 입력 | 타입 | 의미 |
|---|---|---|
| `Velocity` | Vector | 캐릭터의 월드 속도 (보통 CMC.Velocity 의 평면 성분) |
| `BaseRotation` | Rotator | 기준 회전 (보통 캐릭터의 월드 회전) |
| `ReturnValue` | float (-180 ~ 180) | "기준 회전 기준으로 보면 속도가 어느 방향인가" |

### 4.2 결과의 의미

- `0`: 정확히 캐릭터가 보는 방향으로 이동 (전진)
- `90`: 오른쪽으로 평행 이동 (스트레이프)
- `180` 또는 `-180`: 뒤로 이동
- `-90`: 왼쪽으로 평행 이동

캐릭터가 어디를 보고 있든 (BaseRotation) 그 기준으로 상대 각도가 나오므로, 카메라 / 시점 회전과 무관하게 "지금 어느 발이 앞으로 가야 하는가" 를 결정할 수 있다.

### 4.3 사용 패턴

```
UpdateOrientationData
   Velocity     = Get CharacterVelocity2D    # 2D 평면 속도
   BaseRotation = Get WorldRotation          # 캐릭터의 월드 Yaw
   → LocomotionAngle (-180 ~ 180)
       └─ CalculateLocomotionDirection 의 입력으로 들어감
```

연속값 (각도) 을 먼저 산출하고, 그 다음 단계에서 이산 enum 으로 분류하는 2 단 설계가 표준.

---

## 5. 꼭 알아야 할 기능 - 데이터 주도 디버그

### 5.1 S_DebugSetting 으로 게이트

화면 디버그를 "코드에 주석을 달거나 노드를 disable" 하는 게 아니라 **bool 필드로 끄고 켠다**.

```
S_DebugSetting (UserDefinedStruct, 2 필드)
  ShowGaitData       : bool (default True)
  ShowLocomotionData : bool (default True)

ABP_Base.DebugSettings : S_DebugSetting
```

### 5.2 ABP_Base.Debug 그래프 (20 노드)

```
FunctionEntry → Sequence
  ├─[0]→ Branch( DebugSettings.ShowGaitData )
  │         └─true→ DebugPrintString( CurrentGait → Enum to String )
  └─[1]→ Branch( DebugSettings.ShowLocomotionData )
            └─true→ DebugPrintFloat( VectorLengthXY(CharacterVelocity2D) )
                  → DebugDrawVelocity( CharacterVelocity )
                  → DebugPrintFloat( LocomotionAngle )
                  → DebugPrintString( LocomotionDirection → Enum to String )
```

### 5.3 디버그 헬퍼 3 종 (이번 Step 신규)

| 함수 | 시그니처 |
|---|---|
| `DebugPrintString` | `(Key: name, Value: string)` |
| `DebugPrintFloat` | `(Key: name, Value: double, TextColor: LinearColor)` |
| `DebugDrawVelocity` | `(Velocity: Vector, ArrowLength: double, LineColor: LinearColor)` |

각각 화면 좌상단에 키 = 값 출력 (Print), 또는 캐릭터 위에 화살표 그리기 (DrawVelocity).

### 5.4 왜 데이터로 빼는가

- 디자이너 / 다른 작업자도 BP 본문을 수정하지 않고 인스턴스 설정으로 켜고 끌 수 있음
- 디버그 항목이 늘어도 본문 노드 추가 / 삭제 없이 struct 필드만 늘리면 됨
- 같은 패턴이 [Step 2 의 `S_GaitSetting`](./LectureStep2.md), [Step 4 의 `S_DebugSetting.DistanceMatching`](./LectureStep4.md) 으로 반복됨

**원칙**: 바뀔 수 있는 값은 전부 데이터로 뺀다. Step 3 의 ±50 / ±130 / DeadZone 20 도 호출 노드 핀 default 로 노출.

---

## 6. 꼭 알아야 할 기능 - InputDebugKey + Global Time Dilation

### 6.1 BP_LsCharacter.DebugEventGraph (12 노드)

방향 전환 같은 빠른 로코모션을 슬로모션으로 확인하기 위한 디버그 도구.

```
InputDebugKey "Debug Key Num +" ─┐
InputDebugKey "Debug Key Num -" ─┤
                                 ├→ Set Global Time Dilation( Get Global Time Dilation ± step )
                                 └→ Print String( "...", To String(Float) )
```

Numpad `+` / `-` 키로 게임 전체 시간 속도를 조정. 슬로모션 (0.5 → 0.25 → 0.1) 에서 4 방향 전이가 어떻게 일어나는지 한 프레임씩 보기 좋다.

### 6.2 InputDebugKey vs 일반 InputAction

- `InputDebugKey`: 개발 빌드 전용. 패키지 빌드에는 컴파일에서 빠짐
- 일반 `EnhancedInputAction`: 모든 빌드에서 동작

게임 출시 후에는 영향이 없는 디버그 도구를 만들 때 `InputDebugKey` 가 적합.

---

## 7. 자식 ABP 는 안 건드렸다

`ABP_Pistol` / `ABP_UnArmed` 는 [Step 2](./LectureStep2.md) 와 동일:

- parent: `ABP_Layers_C`
- variable: 0
- 그래프: `EventGraph` 만 (모든 노드 disabled)
- 인터페이스: 없음 (부모에서 상속)

방향성 / 디버그 로직이 전부 부모 `ABP_Layers` / `ABP_Base` 에 들어갔다. **공통 로직은 부모에, 자식은 무기 특화만** 의 분담이 다음 Step 까지 유지된다.

---

## 8. 데이터 흐름 한 장

```
매 프레임 (BlueprintThreadSafeUpdateAnimation, worker thread)
   CMC.Velocity       ─ PropertyAccess ─▶ SetVelocityData  → CharacterVelocity / 2D
   Actor.Location     ─ PropertyAccess ─▶ SetLocationData  → WorldLocation
   Actor.Rotation     ─ PropertyAccess ─▶ SetRotationData  → WorldRotation
                                                          ↓
                                            UpdateOrientationData
                                              Calculate Direction(Velocity2D, WorldRotation)
                                                          ↓
                                                  LocomotionAngle (-180 ~ 180)
                                                          ↓
                                       CalculateLocomotionDirection
                                            (±50 / ±130, DeadZone 20, 히스테리시스)
                                            CurrentDirection ← LocomotionDirection (피드백)
                                                          ↓
                                                  LocomotionDirection (F / B / R / L)
                                                          ↓
                                          (LocomotionSM Cycle 상태에서)
                                                          ↓
                                            ABP_Layers.OnCycleUpdate
                                                          ↓
                              Select[CurrentGait](
                                  Walking: Select[Direction](WalkCycleAnims.F/B/R/L),
                                  Jogging: Select[Direction](JogCycleAnims.F/B/R/L)
                              )
                                                          ↓
                                       Set Sequence with Inertial Blending
                                                          ↓
                                          Inertialization → Output Pose

별도 채널:
   ABP_Base.Debug 그래프 - DebugSettings 의 bool 게이트
   BP_LsCharacter.DebugEventGraph - Numpad +/- → Global Time Dilation
```

---

## 9. 이번 Step 의 빈 영역 (다음 Step 에서 채울 것)

- **이동 시작 / 정지** 가 별도 상태 없이 곧바로 Idle ↔ Cycle 만 전이. 출발 / 멈춤 시 발 미끄러짐 발생
- **방향 전환** 이 매끄럽지 않음. 급선회 (180°) 시 시퀀스가 거꾸로 재생되는 듯한 어색함
- **방향 시퀀스 자체** 가 4 칸 이산 - 대각선이 정확히 맞지 않음

다음 Step 에서 Start / Stop / Pivot 상태와 Distance Matching 으로 이 셋을 모두 해결한다.
