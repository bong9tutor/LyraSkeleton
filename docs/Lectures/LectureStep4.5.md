# Step 4.5 - Start/Stop/Pivot + Distance Matching + Warping (심화)

[Step 4](./LectureStep4.md) 와 같은 자산 주제를 한 단계 더 깊이 본다. 새 기능을 추가하는 게 아니라, Step 4 가 빠르게 다룬 부분을 디테일까지 펼친다. Step 4 강의를 먼저 본 뒤 본 자료를 본다.

## 본 강의가 다루는 심화 주제

1. **LocomotionSM 13 전이의 룰 그래프 노드 트리 전체** - 어떤 변수가 어느 전이에 어떻게 들어가는지 노드 단위로
2. **ABP_Base 24 변수의 카테고리 별 분류 + BTSUA 6 단 함수 시그니처** - 매 프레임 일감의 전체 명세
3. **ABP_Layers OnInit / OnUpdate 6 콜백의 노드 수와 책임 분담** - 진입과 갱신의 정확한 경계
4. **PivotSM + ALI default impl 의 빈 그래프** - 인터페이스 구현 그래프는 어디에 사는가
5. **BS_Lean 5 샘플 좌표 풀 메타 + LeanAngle 산출 파이프라인** - axis 와 산출 한계가 정확히 일치하는 설계
6. **BP_LsCharacter.GaitSettings 6 CMC 파라미터 default + 정지 거동 함의** - Gait 프로파일이 정지 거리와 가속 시간에 미치는 영향

---

## 1. LocomotionSM 13 전이의 룰 노드 트리

각 전이는 `from / to / cross_fade_duration` 외에 **rule graph (전이 조건 bool 그래프)** 를 가진다. 13 전이 룰을 노드 class + title 트리로 펼치면 다음과 같다.

| # | 전이 | xfade | rule_nodes |
|---|---|---|---|
| 1 | `Cycle → Stop` | 0.30 | TransitionResult ← NOT Boolean ← Get bIsAccelerating |
| 2 | `Stop → Idle` | 0.25 | TransitionResult ← AND Boolean ← Nearly Equal (Float) ← Vector Length XY ← Get CharacterVelocity2D; 두 번째 분기: Nearly Equal (Float) ← Vector Length XY ← Get Acceleration2D |
| 3 | `Idle → Start` | 0.15 | TransitionResult ← Get bIsAccelerating |
| 4 | `Start → Cycle` (1) | 0.20 | TransitionResult ← Nearly Equal (Float) ← Vector Length XY ← Get CharacterVelocity2D; 두 번째 입력 ← Property Access |
| 5 | `Start → Cycle` (2) | 0.20 | TransitionResult ← Not Equal (Enum) ← Get LastLocomotionDirection, Get LocomotionDirection |
| 6 | `Start → Cycle` (3) | 0.20 | TransitionResult ← Get bIsGaitChanged |
| 7 | `Start → Stop` | 0.25 | TransitionResult ← NOT Boolean ← Get bIsAccelerating |
| 8 | `Stop → Start` | 0.15 | TransitionResult ← Get bIsAccelerating |
| 9 | `PivotAlias → Pivot` | 0.30 | TransitionResult ← float < float ← Dot Product ← Normalize x2 ← Property Access x2 |
| 10 | `Pivot → Cycle` (1) | 0.20 | TransitionResult ← float < float ← Absolute (Float) ← Dot Product ← Normalize x2 ← Get PivotAcceleration2D, Get CharacterVelocity2D |
| 11 | `Pivot → Stop` | 0.20 | TransitionResult ← NOT Boolean ← Get bIsAccelerating |
| 12 | `Pivot → Cycle` (2) | 0.20 | TransitionResult ← AnimGetter `Was Anim Notify Triggered in Source State (Pivot)` |
| 13 | `Start → Cycle` (4) | 0.25 | TransitionResult `Result` 만 (그래프 내 다른 노드 없음) |

### 1.1 트리에서 읽히는 5 가지 패턴

| 패턴 | 어느 전이에서 | 의미 |
|---|---|---|
| 단순 bool 읽기 | 3, 6, 8 | `Get bIsAccelerating` 또는 `Get bIsGaitChanged` 한 변수만 평가 |
| NOT Boolean | 1, 7, 11 | `NOT Boolean ← Get bIsAccelerating` 으로 "가속도 입력 없음" 판정 |
| 속도 / 가속도 0 근처 비교 | 2, 4 | `Nearly Equal ← Vector Length XY ← Get *Velocity2D / Acceleration2D` |
| 방향 변화 검출 | 5 | `Not Equal (Enum) ← Get LastLocomotionDirection, Get LocomotionDirection` |
| 내적 비교 (방향 정렬) | 9, 10 | `float < float ← Dot Product ← Normalize x2` |
| AnimNotify 트리거 | 12 | AnimGetter `Was Anim Notify Triggered in Source State` |

### 1.2 룰 노드 트리로도 단언되지 않는 부분

본 표의 노드 class / title 만으로는 다음이 식별 안 된다.

- `Property Access` 가 실제로 어떤 속성을 읽는지 (예: 4 행, 9 행)
- `float < float` 의 임계값이 어느 속성 / 상수인지
- `Nearly Equal` 의 tolerance 값
- 각 노드 핀 연결의 정확한 끝점

룰 노드 트리로 단언 가능한 범위는 **"Property Access 노드를 거쳐 외부 속성과 비교" 까지**. 그 이상은 에디터 직접 관찰.

### 1.3 꼭 알아야 할 기능 - State Machine Transition Rule 의 노드 트리 읽는 법

전이 룰은 **반환 노드가 항상 `TransitionResult`** 이고, 그 입력 핀에 bool 식이 트리 형태로 연결된다. 읽는 순서:

1. `TransitionResult` 의 입력에 무엇이 직접 연결됐는가 (최상위 bool 노드)
2. 그 bool 노드의 입력에 무엇이 (1 단계 깊이)
3. 잎 노드까지 내려가며 어떤 변수 / 함수 호출이 평가되는지

예: 전이 1 (`Cycle → Stop`)

```
TransitionResult
   └─ K2 NOT Boolean        # bool 부정
      └─ K2 Get bIsAccelerating
```

해석: "`bIsAccelerating` 이 false 이면 전이". 즉 가속도 입력이 사라지면 Stop 상태로.

예: 전이 9 (`PivotAlias → Pivot`)

```
TransitionResult
   └─ float < float           # 좌 < 우 비교
      └─ Dot Product           # 두 벡터의 내적
         ├─ Normalize          # 첫 벡터 정규화
         │  └─ Property Access  # 어떤 벡터 1
         └─ Normalize          # 둘째 벡터 정규화
            └─ Property Access  # 어떤 벡터 2
```

해석: "두 단위 벡터의 내적이 임계값보다 작으면 전이". 두 Property Access 가 무엇을 읽는지는 트리만으로 모르지만, [Step 4 의 Dot Product 각도 대응](./LectureStep4.md) 으로 결과 해석은 가능 (1.0 = 같은 방향, 0.5 = 60°, ...).

---

## 2. ABP_Base 24 변수 + BTSUA 6 단 시그니처

### 2.1 24 변수 카테고리 별

[Step 4](./LectureStep4.md) 에서 카테고리만 빠르게 봤는데, 여기서는 전체 표.

| 카테고리 | 변수 | 타입 |
|---|---|---|
| `VelocityData` | `CharacterVelocity` | Vector |
| | `CharacterVelocity2D` | Vector |
| `LocationData` | `WorldLocation` | Vector |
| | `LastWorld Location` | Vector (실제 명명에 공백 포함) |
| | `DeltaLocation` | real |
| `RotationData` | `WorldRotation` | Rotator |
| | `CurrentYaw` | real |
| | `LastFrameYaw` | real |
| | `DeltaYaw` | real |
| | `LeanAngle` | real |
| `AccelerationData` | `Acceleration` | Vector |
| | `Acceleration2D` | Vector |
| | `PivotAcceleration2D` | Vector |
| | `bIsAccelerating` | bool |
| `LocomotionData` | `LocomotionAngle` | real |
| | `LocomotionDirection` | byte (E_LocomotionDirections) |
| | `LastLocomotionDirection` | byte |
| | `AccelerationLocomotionAngle` | real |
| | `AccelerationLocomotionDirection` | byte |
| `Gait` | `CurrentGait` | byte (E_Gait) |
| | `IncommingGait` | byte |
| | `LastGait` | byte |
| | `bIsGaitChanged` | bool |
| `Debug` | `DebugSettings` | struct (S_DebugSetting) |

모든 변수의 default 가 빈 문자열. 즉 **instance editable 튜닝 노브가 아니라 런타임에 계산되는 캐싱 변수**. 데이터 흐름의 중간 저장소 역할.

### 2.2 BTSUA 6 단 함수 시그니처

[Step 4](./LectureStep4.md) 가 6 단 체인을 소개한 데 더해, 각 함수의 입력 시그니처를 정확히 본다.

```
FunctionEntry
  → SetLocationData(DeltaTime)
  → SetVelocityData
  → SetAccelerationData
  → SetRotationData(DeltaTime, LeanInterpScale=6)
  → UpdateOrientationData
  → SetCharacterStates
```

| 함수 | 입력 | 핵심 동작 |
|---|---|---|
| `SetLocationData` | `(DeltaTime: double)` | 월드 위치 + 이전 위치 + 델타 위치 (3 변수 set) |
| `SetVelocityData` | (없음) | `GetMovementComponent.Velocity` 를 캐싱 (CharacterVelocity / 2D) |
| `SetAccelerationData` | (없음) | `GetMovementComponent.GetCurrentAcceleration` + 2D 정규화 + `bIsAccelerating` 판정 |
| `SetRotationData` | `(DeltaTime, LeanInterpScale=6)` | Yaw + DeltaYaw + LeanAngle 산출 파이프라인 (5 절) |
| `UpdateOrientationData` | (없음) | `LocomotionAngle` / `LocomotionDirection` + `AccelerationLocomotionAngle` / `Direction` |
| `SetCharacterStates` | (없음) | `bIsGaitChanged`, `LastLocomotionDirection`, `LastGait` 비교 set (전이 룰의 입력 변수) |

`SetRotationData` 의 `LeanInterpScale = 6` 입력이 BTSUA 호출 노드의 핀 default 로 노출. 즉 매 프레임 같은 값으로 호출되지만 **값을 호출 노드에서 한 곳에 모아 노출** 한 데이터 주도 패턴.

### 2.3 OnInitPivotState 그래프 (6 노드)

Pivot 상태 진입 순간에 한 번 호출.

```
FunctionEntry
   → Set PivotAcceleration2D   # = Acceleration2D (진입 순간의 입력 방향을 박제)
   → Return
```

저자 코멘트: "Pivot 상태에서 다른 상태로 전환 조건에 사용."

이 값 `PivotAcceleration2D` 가 전이 10 (`Pivot → Cycle` (1)) 의 좌변으로 들어가 "피벗 진입 시점의 입력 방향에 속도가 정렬됐는지" 를 판정한다. 즉 **피벗 종료 조건의 기준점**.

---

## 3. ABP_Layers OnInit / OnUpdate 콜백의 노드 수와 책임

### 3.1 6 콜백 + 1 헬퍼

| 그래프 | 노드 수 | 책임 |
|---|---:|---|
| `OnInitStopAnims` | 17 | Stop 진입 시 방향별 시퀀스 선택 + Explicit Time = 0 (재생 위치 리셋) |
| `OnUpdateStopAnims` | 27 | `Predict Ground Movement Stop Location` + `Distance Match to Target` |
| `OnInitStartAnims` | 25 | Start 진입 시 가속 방향으로 시퀀스 선택 + Inertial Blending |
| `OnUpdateStartAnims` | 18 | `Advance Time by Distance Matching` + Stride Warping Alpha 산출 |
| `OnInitPivotAnims` | 23 | Pivot 진입 시 시퀀스 선택 + Inertial Blending |
| `OnUpdatePivotAnims` | 56 | 매 프레임 피벗 재판정 + `Predict Ground Movement Pivot Location` + Distance Matching |
| `CalculateLocomotionDirection` | 21 | 진입용 5 입력 함수 (DeadZone 없음, ABP_Base 의 7 입력과 별개) |

`OnUpdatePivotAnims` 가 56 노드로 가장 큼. 매 프레임 "지금 피벗이 끝났나 / 또 피벗 들어왔나 / 시간을 어디로 정렬할까" 를 모두 처리.

### 3.2 진입 시 선택 / 업데이트 시 갱신

| 콜백 종류 | 호출 시점 | 책임 | 데이터 출처 |
|---|---|---|---|
| `OnInit*` | 레이어 진입 시 1 회 | 무엇을 재생할지 (방향 / Gait 시퀀스 선택) | CMC 직접 읽기 (캐싱 미신선) |
| `OnUpdate*` | 매 프레임 | 어디를 재생할지 (Distance Matching 시간) | ABP_Base 캐싱값 (신선) |

[Step 4](./LectureStep4.md) 에서 본 디버깅 일지의 결과. OnInit 콜백이 BTSUA 보다 먼저 호출되어 `ABP_Base.Acceleration2D` 캐싱값이 아직 0 이라는 사실이 발견됐고, 그 교훈이 구조로 굳었다.

### 3.3 OnUpdatePivotAnims 의 분기

저자 코멘트 (OnUpdatePivotAnims):

> Then 0: 무엇을 재생할지 (다시 피벗 들어왔는가 판정)
>
> Then 1: 어디를 재생할지 (Distance Matching 시간)

같은 콜백 안에서 두 책임을 명시적으로 분리. Sequence 노드의 두 출력 핀이 각각 분기.

### 3.4 두 개의 CalculateLocomotionDirection

| 위치 | 입력 수 | 용도 |
|---|---|---|
| `ABP_Base` | 7 (DeadZone 20 포함) | BTSUA 의 매 프레임 판정 (히스테리시스 사용) |
| `ABP_Layers` | 5 (DeadZone 없음) | OnInit 콜백 진입 순간의 일회성 판정 |

같은 이름 다른 함수. ABP_Layers 쪽은 OnInit 에서 캐싱값을 못 쓰니 단순 버전을 새로 만들었다. **히스테리시스는 매 프레임 연속 판정용** 이고 진입 1 회에는 필요 없다.

---

## 4. PivotSM + ALI default impl 의 빈 그래프

### 4.1 PivotSM 구조 재확인

```
PivotSM (PivotLayer 안의 중첩 State Machine)
  상태: A, B (AnimStateNode 2 개)
  전이: WantToPivot (A ↔ B 핑퐁)
  각 상태 내부:
     Sequence Evaluator → Orientation Warping → Output Animation Pose
  레이어 출력:
     PivotSM → Inertialization → Output Pose
```

한 상태가 피벗 애님을 재생하는 동안 다른 상태가 다음 피벗을 받을 준비를 하고, 새 피벗이 들어오면 비어 있는 쪽으로 전이.

### 4.2 ALI_Animation 의 default impl 은 빈 Output Pose 1 노드

`ALI_Animation` 인터페이스의 5 레이어 함수 (`IdleLayer / CycleLayer / StopLayer / StartLayer / PivotLayer`) 의 default 구현은 **모두 빈 Output Pose 1 노드**.

```
ALI_Animation (Animation Layer Interface 자산)
   graph_count : 5
   graphs      : [IdleLayer, CycleLayer, StopLayer, StartLayer, PivotLayer]

ALI_Animation 의 PivotLayer 그래프
   nodes:
     - class: AnimGraphNode_Root
       title: "Output Pose\nPivotLayer"
       connected_pins: []
   count: 1
```

즉 인터페이스 자산 자체는 "default 가 비어 있는 약속" 만 들고 있다.

### 4.3 인터페이스 구현 그래프는 어디에 있나

PivotSM / Orientation Warping / Stride Warping 노드가 실제로 사는 곳은 **`ABP_Layers` 의 인터페이스 구현 그래프**. 그러나 `ABP_Layers` 의 일반 그래프 목록 (EventGraph / AnimGraph / GetBaseAnimBP / 9 콜백 = 12 그래프) 에는 이 5 개 구현 그래프가 포함되지 않는다.

```
ABP_Layers
  일반 그래프 (12):
    EventGraph, AnimGraph, GetBaseAnimBP,
    OnIdleUpdate, OnCycleUpdate,
    OnInitStopAnims, OnUpdateStopAnims,
    OnInitStartAnims, OnUpdateStartAnims,
    OnInitPivotAnims, OnUpdatePivotAnims,
    CalculateLocomotionDirection

  + 인터페이스 구현 그래프 (5, 별도 위치):
    IdleLayer, CycleLayer, StopLayer, StartLayer, PivotLayer
    ↑ 여기에 PivotSM / Warping 노드가 산다
```

### 4.4 꼭 알아야 할 기능 - Animation Layer Interface 의 default impl 위치 추적

이번 Step 의 핵심 학습 한 가지: **인터페이스 함수의 구현은 자식 ABP 가 가진다**. 인터페이스 자산 자체는 시그니처만 약속하고, default 는 빈 Output Pose.

자식 ABP 의 인터페이스 구현을 보려면 에디터에서:

1. `ABP_Layers` 를 연다
2. 좌측 패널의 **Animation Layers** 섹션 (또는 My Blueprint 의 인터페이스 영역)
3. `ALI_Animation` 인터페이스의 5 함수 (`IdleLayer / CycleLayer / StopLayer / StartLayer / PivotLayer`) 가 보임
4. 각 함수를 더블 클릭하면 인터페이스 구현 그래프가 열림 (여기에 PivotSM / Warping 등)

`ABP_Pistol` / `ABP_UnArmed` 자식 ABP 는 `ABP_Layers` 를 상속받아 같은 5 함수를 가지지만, 현재는 부모의 구현을 그대로 사용 (override 안 함). 무기별로 다른 포즈가 필요하면 자식 ABP 에서 해당 함수를 override 하면 된다.

---

## 5. BS_Lean + LeanAngle 산출 파이프라인

### 5.1 BS_Lean 의 axis + 5 샘플

```
BS_Lean
  skeleton: SK_Mannequin
  is_1d:    false
  axis_x:   LeanAngle  [-90, 90]   grid_div=2  snap=true  wrap=false
  axis_y:   Gait       [  0,  1]   grid_div=2  snap=true  wrap=false
  samples (5):
    0: MM_Rifle_Jog_Lean_Center    (x= 0, y=0.5)
    1: MM_Rifle_Jog_Lean_Center    (x= 0, y=1.0)
    2: MM_Rifle_Jog_Lean_Center    (x= 0, y=0.0)
    3: MM_Rifle_Jog_Leans_Left     (x=-90, y=1.0)
    4: MM_Rifle_Jog_Lean_Right     (x= 90, y=1.0)
```

샘플 5 개 중 3 개가 같은 `Lean_Center` 시퀀스를 다른 Y (Gait) 좌표에 배치 = X = 0 라인을 Y 전 범위에서 안정시키는 의도.

### 5.2 LeanAngle 산출 파이프라인

```
DeltaYaw (= CurrentYaw - LastFrameYaw)
   ▼ Safe Divide(DeltaYaw / DeltaTime)          # 초당 회전 속도 (deg/s)
   ▼ Safe Divide(각속도 / LeanInterpScale=6)
   ▼ float * float ◀── Select[LocomotionDirection]   # F=1, B=-1, R/L=0
   ▼ Clamp Angle(Min -90, Max 90)               # BS_Lean X 축 범위와 정확히 일치
   ▼ Set LeanAngle
```

저자 코멘트:

- `LeanInterpScale`: "각속도 (deg/s) 를 '기울임 각도' 로 변환하는 스케일 / 감도 보정 상수. 6 보다 크면 덜 기울어짐, 6 보다 작으면 더 기울어짐"
- `float * float ← Select[LocomotionDirection]`: "뒤로 달릴 때 반전"
- `Clamp Angle`: "기울임 한계 제한"

### 5.3 axis 와 산출 한계가 일치하는 설계

`Clamp Angle` 의 `[-90, 90]` 과 `BS_Lean.axis_x` 의 `[-90, 90]` 이 정확히 일치. 우연이 아니라 **"이 변수를 BS_Lean 의 X 입력으로 쓰겠다" 라는 설계** 의 표현.

| 한 자산의 axis | 다른 자산의 산출 한계 |
|---|---|
| `BS_Lean.axis_x: LeanAngle [-90, 90]` | `ABP_Base.SetRotationData` 의 `Clamp Angle(-90, 90)` |
| `BS_Lean.axis_y: Gait [0, 1]` | `E_Gait` 의 값 범위 (Walking = 0, Jogging = 1) |

이런 일치는 두 자산이 같은 데이터를 공유하기 위해 의도된 것. 학습 자료에서 이런 매칭을 발견하면 "여기서 이 변수가 이쪽 자산의 입력으로 들어간다" 는 강한 단서.

### 5.4 합성 노드는 배치됐으나 Output Pose 미연결

CycleLayer 안에 `BS_Lean Blendspace Player` + `Apply Additive` 두 노드가 배치돼 있지만 **Apply Additive 의 출력이 CycleLayer 의 Output Pose 체인에 미연결**.

| 구성 요소 | 상태 |
|---|---|
| BS_Lean 에셋 | 완성 |
| LeanAngle 변수 + 산출 | 완성 |
| BS_Lean Player + Apply Additive 노드 | 배치됨 |
| Apply Additive → Output Pose 연결 | 미연결 |
| 화면 반영 | 미동작 |

다음 단계로 한 선만 잇고 X / Y 핀에 `LeanAngle` / `Gait` 연결하면 완성. **에셋과 데이터는 완성된 상태로 머무는 미완 - 학습용으로 좋은 예** (한 단계가 모자라면 어떤 모양이 되는지).

---

## 6. BP_LsCharacter.GaitSettings - 두 엔트리 6 CMC 파라미터

[Step 2](./LectureStep2.md) 에서 데이터 모델 (`E_Gait` + `S_GaitSetting` + `GaitSettings` 맵) 자체는 다뤘다. 여기서는 **default 값 자체와 그 게임플레이 함의** 를 본다.

### 6.1 GaitSettings map 의 default

`BP_LsCharacter.GaitSettings: Map<byte, S_GaitSetting>` 는 Gait 별로 CharacterMovementComponent 의 6 파라미터를 묶어 두는 매핑. 맵의 키는 `E_Gait` enum (Step 2 정의: `NewEnumerator0 = Walking`, `NewEnumerator1 = Jogging`).

| Gait | MaxWalkSpeed | MaxAccel | BrakingDecel | BrakingFrictionFactor | BrakingFriction | bUseSeparateBrakingFriction |
|---|---:|---:|---:|---:|---:|---|
| `NewEnumerator0` (Walking) | 250.0 | 250.0 | 250.0 | 1.0 | 0.0 | false |
| `NewEnumerator1` (Jogging) | 800.0 | 500.0 | 1200.0 | 1.0 | 0.0 | true |

`BrakingFriction` 은 두 엔트리 모두 생략 (struct default `0.0` 과 일치하면 ImportText 직렬화에서 생략됨). `bUseSeparateBrakingFriction` 도 Walking 엔트리에서 생략 = struct default `false`.

### 6.2 정지 거동 차이의 함의

`BrakingDecelerationWalking` 만 봐도 Walking `250` vs Jogging `1200` 으로 4.8 배 차이. 같은 Stop 전이라도 Gait 프로파일에 따라 정지 거리가 달라진다.

마찰을 무시한 거친 추정 (`d = v² / (2a)`):

| Gait | v | a (braking) | d (마찰 무시) |
|---|---:|---:|---:|
| Walking | 250 | 250 | 125 |
| Jogging | 800 | 1200 | 약 266.7 |

거친 추정만으로도 약 **2.13 배 정지 거리**. 실제 게임에서는 friction 항이 추가로 들어가 더 복잡한 곡선이 된다.

### 6.3 꼭 알아야 할 기능 - GaitSettings 가 CMC 에 영향을 주는 방식

`BP_LsCharacter.SetGaitAndApplySettings` 함수가 Aim 입력 (또는 향후 추가될 Gait 전환 입력) 에 따라 호출되며, `GaitSettings.Find(Gait)` 로 프로파일을 꺼내 6 파라미터를 CMC 에 set ([Step 2](./LectureStep2.md)).

이 6 파라미터가 [Step 4 의 `Predict Ground Movement Stop Location`](./LectureStep4.md) 의 입력이다. 즉:

```
Aim / Gait 전환 입력
   → SetGaitAndApplySettings(Gait)
   → CMC 의 6 파라미터 update
   → 다음 프레임:
        Stop 상태 진입 시 OnUpdateStopAnims 가
        Predict Ground Movement Stop Location 호출
        → 변경된 6 파라미터로 정지 거리 예측
        → 그 거리에 맞춰 Distance Matching 으로 시퀀스 시간 정렬
```

**Gait 전환이 단순 비주얼이 아니라 정지 거리와 가속 시간을 바꾼다**. Jogging 모드 (Aim 을 떼서 진입) 의 캐릭터가 더 빨리 달리고 (800 cm/s) 더 가파르게 멈춘다 (1200 brake) 는 게임플레이 차이가 GaitSettings 한 맵으로 표현됐다. 무기 상태 (`E_Weapon`) 는 시각적 레이어만 갈아끼우므로 이 6 파라미터에는 영향을 주지 않는다.

### 6.4 새 Gait 추가 시나리오 (예: Sprint)

1. `E_Gait` 에 `Sprint = 2` 엔트리 추가
2. `BP_LsCharacter.GaitSettings` 맵에 `Sprint` 키 + 새 `S_GaitSetting` 값 추가 (예: 1200 / 600 / 1500 / ...)
3. (선택) 새 입력 `IA_Sprint` 추가, EventGraph 에서 `SetGaitAndApplySettings(Sprint)` 호출

**CMC 코드 / `SetGaitAndApplySettings` 함수 본체는 변경하지 않는다**. 데이터 주도 설계의 가치.

---

## 7. 학습 포인트 정리

1. **State Machine 전이의 의미는 룰 그래프의 노드 트리까지 봐야 정확히 잡힌다**. `from / to / blend_mode` 만으로는 "어떤 변수로 평가되는가" 가 안 보인다. TransitionResult 부터 트리로 내려가며 잎 노드의 변수 / 함수를 추적.

2. **BTSUA 함수 시그니처가 곧 매 프레임 일감의 명세**. 6 단 체인이 무엇을 입력으로 받고 어떤 변수를 채우는지 = 게임 한 프레임의 데이터 파이프라인.

3. **OnInit 과 OnUpdate 가 분리된 이유는 캐싱 타이밍 때문**. OnInit 은 BTSUA 보다 먼저 호출되니 캐싱 미신선 → CMC 에서 직접. OnUpdate 는 매 프레임 안전한 캐싱값 사용.

4. **Animation Layer Interface 의 default 는 비어 있고, 실제 구현은 자식 ABP 가 가진다**. 인터페이스 자산 자체에서 PivotSM / Warping 을 찾으면 안 되고, 자식 ABP 의 인터페이스 구현 그래프를 봐야 한다.

5. **BS_Lean 의 X 축 `[-90, 90]` 이 `Clamp Angle` 의 한계와 정확히 일치한다는 사실** 은 두 자산이 한 변수로 연결되도록 의도된 설계의 단서. 학습 자료에서 이런 매칭을 발견하면 데이터 흐름을 추적할 강한 출발점.

6. **GaitSettings 의 6 CMC 파라미터 default 가 게임플레이 함의를 만든다**. Gait 전환이 단순 비주얼이 아니라 정지 거리 / 가속 시간 차이를 만든다. 데이터 모델의 default 값까지 들여다봐야 캐릭터의 행동을 이해할 수 있다.
