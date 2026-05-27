# Step 4.5 - Start / Stop / Pivot + Distance Matching + Warping (심화)

> **한 줄 요약.** [Step 4](Step4/index.html) 와 **같은 자산 주제** (Start / Stop / Pivot + Distance Matching + Warping) 를, 분석 도구가 더 상세해진 덕에 한 단계 더 깊이 본 심화 분석. 본문은 자산이 무엇이고 어떻게 동작하는지 자체이며, 8 섹션 골격을 Step 4 와 정렬해 같은 번호로 짝지어 읽을 수 있다.

> **사실 기준일.** 2026-05-26. Unreal Engine 5.7 (CL-51494982). 본 분석은 read-only 이며 `git status` 가 clean 인 상태에서 수행됐다.

> **분석 깊이가 늘어난 배경 (한 단락).** Step 4 가 분석에 사용한 도구 (Monolith MCP) 가 발전하면서, Step 4 작성 시점에는 응답 폭이 좁아 본문에 명시하기 어려웠던 사실들이 본 분석에서는 한 호출로 노출된다. 대표적으로 (1) State Machine 전이의 **룰 그래프 노드 트리**, (2) Blueprint 변수의 **map 타입 default ImportText 직렬화**, (3) BlendSpace 의 **axis/sample 풀 메타** 가 한 호출로 나온다. 본 문서는 그 더 상세해진 응답을 자산 분석 본문에 녹여 Step 4 보다 두툼한 사실 묶음을 만든다 - 도구 버전 자체는 본문이 아니다 ([Research 섹션 11](Research_UE_Asset_Analyze.md) 의 작성 원칙).

> **작성 규약.** [CLAUDE.md](../CLAUDE.md) + [Research 섹션 11 Step 간 분석 문서 작성 원칙](Research_UE_Asset_Analyze.md). em dash 미사용 · ASCII 하이픈 통일 · 도구 차이가 본문을 침범하지 않음 · 8 섹션 골격 Step 4 와 정렬.

---

## 1. 개요 - 본 심화 분석에서 부각된 핵심 사실

[Step 4](Step4/index.html) 가 자산별로 한 줄씩 본 8 섹션 골격을 그대로 따르되, 각 자산의 분석 깊이를 한 단계 늘렸다. 본 문서가 Step 4 보다 더 상세하게 본문화한 핵심 사실은 다음과 같다.

| 섹션 | 자산 주제 | 본 심화 분석에서 추가된 사실 |
|---|---|---|
| [2](#2-locomotionsm---5-상태--13-전이의-룰-노드-트리) | `LocomotionSM` (5 상태 + 13 전이) | **13 전이 각각의 룰 그래프 노드 트리** (TransitionResult 부터 PropertyAccess 까지 노드 class + title) |
| [3](#3-abp_base-데이터-파이프라인---24-변수--btsua-6-단) | `ABP_Base` 변수 / BTSUA | 24 변수의 **카테고리 별 분류** + BTSUA 6 단 함수 시그니처 + `OnInitPivotState` 그래프 |
| [4](#4-abp_layers--start--stop--pivot-콜백--distance-matching) | ABP_Layers OnInit/OnUpdate + Distance Matching | 6 콜백의 노드 수 / 역할 + Distance Matching 의 **전제 조건 2 가지 실측** |
| [5](#5-레이어-그래프--orientation--stride-warping--pivotsm) | 레이어 그래프 + Warping + PivotSM | 5 레이어의 합성 노드 배치 + **ALI default impl 이 빈 Output Pose 1 노드라는 사실 + Monolith enumerate 한계** |
| [6](#6-bs_lean--leanangle-산출--debug-확장) | BS_Lean + LeanAngle + Debug | BS_Lean 의 **5 샘플 좌표 풀 메타** + LeanAngle 산출 파이프라인 + `Apply Additive` 미연결 + `S_DebugSetting` 필드 표 |
| [7](#7-bp_lscharacter--imc-ia--gaitsettings-6-cmc-파라미터) | BP_LsCharacter + IMC + GaitSettings | **`GaitSettings: map<byte, S_GaitSetting>` 의 두 엔트리 6 CMC 파라미터 default 값** + 정지 거동 함의 |
| [8](#8-종합--환경-점검--c--다음-단계--부록) | 종합 + 환경 + 부록 | 자산별 diff 표 + 본 분석에서 처음 본문화한 사실 + 모듈 vs 네임스페이스 차이 진단 + 출처 매트릭스 |

명시적 비범위:
- 새 자산 분석 (이 문서는 Step 4 가 본 자산만 본다).
- `L_Start.umap` 의 액터/조명.
- write 액션 실행.

---

## 2. LocomotionSM - 5 상태 + 13 전이의 룰 노드 트리

> **자산.** `ABP_Base` 내부의 `LocomotionSM` (Animation State Machine). 캐릭터의 이동/정지/시작/방향전환 상태 전이를 관리.

### 2.1 5 상태 + 1 별칭의 구성

각 상태는 `ALI_Animation` 의 대응 레이어를 호출만 하는 2 노드짜리 얇은 상태다. 무거운 로직은 ABP_Layers 의 OnInit/OnUpdate 콜백 (섹션 4) 으로 분리된다.

```
              bIsAccelerating
   Idle ────────────────────────▶ Start ─────────────▶ Cycle
    ▲                              │                    │ !bIsAccel
    │                              │ !bIsAccel          ▼
    │                              ▼                   Stop
    │                             Stop                  │ bIsAccel
    │                              ▲                    │
    └────────── Stop ◀─── Cycle ───┘                    │
                                                       Start
   PivotAlias ──(dot(norm v, norm a) < 임계)──▶ Pivot
   Pivot ──(방향 정렬 or AN_TransitionToLocomotion)──▶ Cycle
   Pivot ──(!bIsAccel)──▶ Stop

# PivotAlias = 상태 별칭(State Alias). 여러 상태에서 Pivot 진입을 한 룰로 묶는다.
```

### 2.2 5 상태와 ALI 레이어 함수 매핑

| 상태 | 내부 노드 (2 개) | 대응 ALI 레이어 |
|---|---|---|
| `Idle` (entry) | Output Animation Pose ← Linked Anim Layer | `IdleLayer` |
| `Cycle` | 동일 패턴 | `CycleLayer` |
| `Stop` | 동일 패턴 | `StopLayer` |
| `Start` | 동일 패턴 | `StartLayer` |
| `Pivot` | 동일 패턴 | `PivotLayer` |

5 개 레이어 함수는 모두 입출력 핀이 없는 포즈 반환 시그니처. 즉 SM 의 상태는 "어느 레이어를 호출할지" 만 결정하고, 포즈 합성/거리 매칭/Warping 은 ABP_Layers 가 구현한 레이어 그래프 안에서 (섹션 5) 일어난다.

### 2.3 13 전이의 룰 노드 트리

각 전이는 `from / to / cross_fade_duration` 외에 **rule graph (전이 조건 bool 그래프)** 를 가진다. 13 전이 룰의 노드 class + title 트리:

| # | 전이 | xfade | rule_nodes (class · title) |
|---|---|---|---|
| 1 | `Cycle → Stop` | 0.30 | TransitionResult `Result` ← K2 `NOT Boolean` ← K2 `Get bIsAccelerating` |
| 2 | `Stop → Idle` | 0.25 | TransitionResult ← `AND Boolean` ← `Nearly Equal (Float)` ← `Vector Length XY` ← `Get CharacterVelocity2D`; 두 번째 분기: `Nearly Equal (Float)` ← `Vector Length XY` ← `Get Acceleration2D` |
| 3 | `Idle → Start` | 0.15 | TransitionResult ← `Get bIsAccelerating` |
| 4 | `Start → Cycle` (1) | 0.20 | TransitionResult ← `Nearly Equal (Float)` ← `Vector Length XY` ← `Get CharacterVelocity2D`; 두 번째 입력 ← `Property Access` |
| 5 | `Start → Cycle` (2) | 0.20 | TransitionResult ← `Not Equal (Enum)` ← `Get LastLocomotionDirection`, `Get LocomotionDirection` |
| 6 | `Start → Cycle` (3) | 0.20 | TransitionResult ← `Get bIsGaitChanged` |
| 7 | `Start → Stop` | 0.25 | TransitionResult ← `NOT Boolean` ← `Get bIsAccelerating` |
| 8 | `Stop → Start` | 0.15 | TransitionResult ← `Get bIsAccelerating` |
| 9 | `PivotAlias → Pivot` | 0.30 | TransitionResult ← `float < float` ← `Dot Product` ← `Normalize` x2 ← `Property Access` x2 |
| 10 | `Pivot → Cycle` (1) | 0.20 | TransitionResult ← `float < float` ← `Absolute (Float)` ← `Dot Product` ← `Normalize` x2 ← `Get PivotAcceleration2D`, `Get CharacterVelocity2D` |
| 11 | `Pivot → Stop` | 0.20 | TransitionResult ← `NOT Boolean` ← `Get bIsAccelerating` |
| 12 | `Pivot → Cycle` (2) | 0.20 | TransitionResult ← AnimGetter `Was Anim Notify Triggered in Source State (Pivot)` |
| 13 | `Start → Cycle` (4) | 0.25 | TransitionResult `Result` 만 (그래프 내 다른 노드 없음) |

### 2.4 룰 노드 트리에서 읽히는 패턴

- **속도/가속도의 0 근처 비교 (전이 2, 4)**: `Nearly Equal (Float) ← Vector Length XY ← Get *Velocity2D/Acceleration2D`. "거의 정지" 또는 "거의 가속 없음" 을 판정.
- **방향 변화 검출 (전이 5)**: `Not Equal (Enum) ← Get LastLocomotionDirection, Get LocomotionDirection`. 방향이 바뀌면 Start 시퀀스를 다시 재생.
- **Gait 변화 검출 (전이 6)**: `Get bIsGaitChanged`. ABP_Base 가 `SetCharacterStates` 단에서 set 하는 상태 변수 (섹션 3).
- **Pivot 판정 (전이 9, 10)**: `float < float ← Dot Product ← Normalize x2`. 두 단위 벡터의 내적 (방향 각도 차의 cosine) 을 임계와 비교. 전이 9 는 진입용 (방향 정렬 깨짐), 전이 10 은 종료용 (다시 정렬됨, 절댓값 사용).
- **AnimNotify 기반 종료 (전이 12)**: AnimGetter `Was Anim Notify Triggered in Source State`. `AN_TransitionToLocomotion` 노티파이가 Pivot 시퀀스 안에서 트리거되면 Cycle 로 빠진다.

### 2.5 룰 노드 트리로도 단언되지 않는 부분

본 표의 노드 class/title 만으로는 다음이 여전히 식별 안 된다. Step 4 본문이 자연어로 풀어 쓴 "MaxSpeed 비교", "임계" 등의 우변은 이 한계 안에 있다.

- `K2Node_PropertyAccess` 가 실제로 어떤 속성을 읽는지 (예: 표 4행 · 9행)
- `float < float` 의 임계값이 어느 속성/상수인지
- `Nearly Equal` 의 tolerance 값
- 각 노드 핀 연결의 정확한 끝점과 데이터 흐름

룰 노드 트리로 단언 가능한 범위는 "PropertyAccess 노드를 거쳐 외부 속성과 비교" 까지다. 그 이상의 정확한 우변은 에디터 직접 관찰 또는 그래프 풀 덤프가 필요하다.

### 2.6 신규 자산 - `AN_TransitionToLocomotion`

Step 4 가 추가한 빈 마커 노티파이. `AnimNotify` 를 상속한 data-only 블루프린트 (graph 0, var 0, fn 0). Pivot 시퀀스에 배치되는 시점 표시이며, 섹션 2.3 의 전이 12 (`Pivot → Cycle` (2)) 의 `Was Anim Notify Triggered in Source State (Pivot)` 가 이 노티파이를 본다.

> **배경 노트.** 섹션 2.3 의 13 전이 룰 노드 트리 표는 본 분석에서 처음 본문화하는 사실이다. Step 4 작성 시점의 응답 폭에서는 transition rule graph 가 `from / to / blend_mode / duration` 까지만 나왔고, 본 분석 시점에는 `rule_nodes` 배열이 함께 emit 되어 노드 단위로 검증할 수 있다.

---

## 3. ABP_Base 데이터 파이프라인 - 24 변수 + BTSUA 6 단

> **자산.** `/Game/ALS/Characters/ABP_Base`. 본 프로젝트의 메인 AnimBP. BTSUA (BlueprintThreadSafeUpdateAnimation) 에서 캐릭터 상태를 매 프레임 수집해 SM/레이어로 흘려보낸다. `graph_count: 16`, `variable_count: 24`, `state_machine_count: 1`.

### 3.1 24 변수 카테고리 별 분류

ABP_Base 의 24 변수는 7 카테고리로 정리된다. 모든 변수의 default 가 빈 문자열 - 즉 instance editable 튜닝 노브가 없는 **순수 파이프라인 ABP** 의 구조.

| 카테고리 | 변수 |
|---|---|
| `VelocityData` | `CharacterVelocity` / `CharacterVelocity2D` (Vector) |
| `LocationData` | `WorldLocation`, `LastWorld Location` (공백 포함 실제 명명, Vector), `DeltaLocation` (real) |
| `RotationData` | `WorldRotation` (Rotator), `CurrentYaw`, `LastFrameYaw`, `DeltaYaw`, `LeanAngle` (real) |
| `AccelerationData` | `Acceleration`, `Acceleration2D`, `PivotAcceleration2D` (Vector), `bIsAccelerating` (bool) |
| `LocomotionData` | `LocomotionAngle` (real), `LocomotionDirection`, `LastLocomotionDirection` (byte), `AccelerationLocomotionAngle` (real), `AccelerationLocomotionDirection` (byte) |
| `Gait` | `CurrentGait`, `IncommingGait`, `LastGait` (byte), `bIsGaitChanged` (bool) |
| `Debug` | `DebugSettings: struct:S_DebugSetting` |

### 3.2 BTSUA exec 체인 6 단

`BlueprintThreadSafeUpdateAnimation(DeltaTime: double)` 의 exec 체인이 6 단으로 구성된다. 매 프레임 main thread 외부 (worker thread) 에서 안전하게 수행된다.

```
FunctionEntry
  → SetLocationData(DeltaTime)
  → SetVelocityData
  → SetAccelerationData
  → SetRotationData(DeltaTime, LeanInterpScale=6)
  → UpdateOrientationData
  → SetCharacterStates
```

함수 시그니처:

| 함수 | 입력 | 역할 |
|---|---|---|
| `SetLocationData` | `(DeltaTime: double)` | 월드 위치 + 이전 위치 + 델타 위치 산출 |
| `SetVelocityData` | (없음) | `GetMovementComponent.Velocity` 를 캐싱 |
| `SetAccelerationData` | (없음) | `GetMovementComponent.GetCurrentAcceleration` + 2D 정규화 + `bIsAccelerating` |
| `SetRotationData` | `(DeltaTime, LeanInterpScale=6)` | Yaw + DeltaYaw + LeanAngle 산출 파이프라인 (섹션 6.2) |
| `UpdateOrientationData` | (없음) | `LocomotionAngle` + `LocomotionDirection` + `AccelerationLocomotionAngle/Direction` |
| `SetCharacterStates` | (없음) | `bIsGaitChanged`, `LastLocomotionDirection`, `LastGait` 비교 set |

### 3.3 `OnInitPivotState` 그래프

Pivot 상태 진입 순간에 한 번 호출되는 6 노드 그래프. 본질은 `Set PivotAcceleration2D = Acceleration2D`.

```
FunctionEntry
  → Set PivotAcceleration2D   # = Acceleration2D (진입 순간의 입력 방향을 박제)
  → Return
```

이 값은 섹션 2.3 의 전이 10 (`Pivot → Cycle` (1)) 의 좌변으로 들어가 "피벗 진입 시점의 입력 방향에 속도가 정렬됐는지" 를 판정한다. 즉 피벗 종료 조건의 기준점.

### 3.4 왜 가속도(Acceleration) 가 신설됐나

Step 3 까지는 `Velocity` (실제 움직이는 방향) 만 봤다. Step 4 는 `AccelerationData` 카테고리 전체를 신설해 `Acceleration` (플레이어가 입력한 방향) 을 별도 채널로 둔다. 둘은 보통 같지만 다음 3 시점에서 갈라진다:

- **출발 순간**: Acceleration 입력 시작 vs Velocity 아직 0
- **정지 순간**: Acceleration 0 (입력 뗌) vs Velocity 관성으로 0 아님
- **급선회**: Acceleration 새 방향 vs Velocity 옛 방향

이 두 채널의 갈라짐을 보는 것이 Pivot 감지 (전이 9, 10) 의 핵심.

---

## 4. ABP_Layers + Start / Stop / Pivot 콜백 + Distance Matching

> **자산.** `/Game/ALS/Characters/ABP_Layers` (Linked Anim Layer 구현 ABP) + `/Game/ALS/Interfaces/ALI_Animation` (Animation Layer Interface). `graph_count: 12`, `variable_count: 12`.

### 4.1 12 변수 - S_DirectionalAnims 의 4 회 재사용

`S_DirectionalAnims` (Forward / Backward / Right / Left 4 개 `UAnimSequence*`) 구조체를 8 번 사용 (Walk/Jog x Cycle/Stop/Start/Pivot) 해 시퀀스 풀을 채운다. 변수 카테고리 별:

| 카테고리 | 변수 |
|---|---|
| `Idle` | `IdleAnim` (AnimSequenceBase) |
| `Cycle` | `WalkCycleAnims`, `JogCycleAnims` (S_DirectionalAnims) |
| `Stop` | `WalkStopAnims`, `JogStopAnims` |
| `Start` | `WalkStartAnims`, `JogStartAnims` |
| `Pivot` | `WalkPivotAnims`, `JogPivotAnims` |
| `Default` | `StrideWarpingStartAlpha` (real, 0.0), `StrideWarpingBlendInStartOffset` (real, 0.15), `StrideWarpingBlendInDurationScaled` (real, 0.20) |

Pivot 묶음의 4 방향은 의도된 "반대 매핑" 을 가진다 - Forward → `*_Bwd_Pivot`, Backward → `*_Fwd_Pivot`, Right → `*_Left_Pivot`, Left → `*_Right_Pivot`. 피벗이 "현재 진행 방향과 새 가속 방향의 관계" 로 선택되는 동작이라 그렇다.

### 4.2 12 그래프 - 신규 7 콜백

Step 4 가 더한 7 콜백 그래프. OnInit / OnUpdate 가 정확히 쌍을 이루는 설계.

| 그래프 | 노드 수 | 역할 |
|---|---:|---|
| `OnInitStopAnims` | 17 | Stop 진입 시 방향별 시퀀스 선택 + Explicit Time = 0 |
| `OnUpdateStopAnims` | 27 | `Predict Ground Movement Stop Location` + `Distance Match to Target` |
| `OnInitStartAnims` | 25 | Start 진입 시 가속 방향으로 시퀀스 선택 + Inertial Blending |
| `OnUpdateStartAnims` | 18 | `Advance Time by Distance Matching` + Stride Warping Alpha 산출 |
| `OnInitPivotAnims` | 23 | Pivot 진입 시 시퀀스 선택 + Inertial Blending |
| `OnUpdatePivotAnims` | 56 | 매 프레임 피벗 재판정 + `Predict Ground Movement Pivot Location` + Distance Matching |
| `CalculateLocomotionDirection` | 21 | 진입용 5 입력 함수 (DeadZone 없음, ABP_Base 의 7 입력 함수와 별개) |

원칙: **OnInit 은 진입 순간의 선택, OnUpdate 는 매 프레임 갱신**. 두 역할이 명확히 갈린 이 패턴이 Step 4 의 디버깅 일지 ("진입 시 선택 / 업데이트 시 갱신") 가 구조로 굳은 결과다.

### 4.3 Distance Matching 의 전제 조건 (실측)

Distance Matching 이 동작하려면 다음 두 조건이 만족돼야 한다.

1. **각 전이 시퀀스가 `Distance` 커브를 가져야 한다.** Animation Data Modifiers > Distance Curve Modifier 로 생성. 시퀀스의 "0 cm 부터 끝까지 진행한 거리" 를 시간에 매핑한 커브.
2. **시퀀스의 Curve Compression 이 `UniformIndexableCurveCompressionSettings` 여야 한다.** 런타임이 distance curve 를 인덱스로 빠르게 역조회하려면 이 압축 설정이 필요.

실측: Stop/Start/Pivot 전이 시퀀스 **24 개 모두 두 조건을 만족**. `get_sequence_curves` + `get_asset_details.dependencies` 로 확인.

추가 전제: `LyraSkeleton.uproject` 의 `Plugins[]` 에 `AnimationLocomotionLibrary` 가 활성화돼 있어야 한다. 실측: Step 3 시점에 미명시였던 이 플러그인이 Step 4 에서 추가됐다 (OS file read 로 확인).

### 4.4 ALI_Animation 레이어 함수 2 → 5

ALI_Animation 자체는 `AnimLayerInterface` 를 부모로 하는 인터페이스다. Step 4 가 다음 3 함수를 추가해 총 5 함수가 됐다.

| 레이어 함수 | Step | 대응 SM 상태 |
|---|---|---|
| `IdleLayer` | Step 1~ | Idle |
| `CycleLayer` | Step 2~ | Cycle |
| `StopLayer` | Step 4 | Stop |
| `StartLayer` | Step 4 | Start |
| `PivotLayer` | Step 4 | Pivot |

5 함수 모두 입출력 핀 없는 포즈 반환 시그니처.

---

## 5. 레이어 그래프 + Orientation / Stride Warping + PivotSM

> **자산.** `ABP_Layers` 의 5 레이어 구현 그래프 (`IdleLayer / CycleLayer / StopLayer / StartLayer / PivotLayer`).

### 5.1 5 레이어 그래프의 구성

| 레이어 | 그래프 구성 |
|---|---|
| `IdleLayer` | Sequence Player → Output Pose |
| `CycleLayer` | Sequence Player → **Orientation Warping → Stride Warping** → Output Pose (+ BS_Lean Player + Apply Additive 배치, 미연결, 섹션 6.3) |
| `StopLayer` | Sequence Evaluator → **Orientation Warping** → Output Pose |
| `StartLayer` | Sequence Evaluator → **Orientation Warping → Stride Warping** → Output Pose |
| `PivotLayer` | **PivotSM** (중첩 State Machine 상태 A/B) → Inertialization → Output Pose |

Orientation Warping 은 총 5 노드, 4 레이어 (Cycle / Stop / Start + Pivot 내 A/B). Stride Warping 은 2 노드 (Cycle, Start) 에만.

### 5.2 Orientation Warping 의 역할

하체는 이동 방향, 상체는 조준 방향을 향하도록 분리한다. 4 방향 이산 시퀀스 풀 위에 임의 각도를 메우는 기법.

### 5.3 Stride Warping 의 역할

보폭을 속도에 맞춰 동적으로 조정한다. StartLayer 에서는 `StrideWarpingStartAlpha` 가 시간 진행에 따라 0 → 1 로 키워져 (`OnUpdateStartAnims` 의 Map Range Clamped), 진입 직후의 보폭 불일치를 부드럽게 한다.

### 5.4 PivotSM - 레이어 안의 중첩 State Machine

PivotLayer 만 다른 4 레이어와 구조가 다르다. Sequence 노드 하나가 아니라 **`PivotSM` 중첩 상태 머신** 을 품는다.

| 항목 | 값 |
|---|---|
| 상태 | `A`, `B` (`AnimStateNode` 2 개) |
| 전이 | `WantToPivot` (A ↔ B 핑퐁) |
| 각 상태 내부 | Sequence Evaluator → Orientation Warping → Output Animation Pose |
| 레이어 출력 | PivotSM → Inertialization → Output Pose |

피벗 도중 또 피벗이 들어올 때 모션 끊김을 막는 **핑퐁 버퍼** 다. 한 상태가 피벗 애님을 재생하는 동안 다른 상태가 다음 피벗을 받을 준비를 하고, 새 피벗이 들어오면 비어 있는 쪽으로 전이.

### 5.5 ALI_Animation default impl 의 빈 그래프 + Monolith enumerate 한계

본 분석에서 식별된 도구 한계 한 가지: **섹션 5 의 PivotSM / Orientation Warping / Stride Warping 노드들은 ABP_Layers 의 인터페이스 구현 그래프 안에 있는데, Monolith MCP 의 일반 enumerate 경로 (`list_graphs`, `get_graphs`, `search_nodes`) 로는 그 그래프들이 노출되지 않는다.**

실측:
- `animation_query.get_abp_info("/Game/ALS/Interfaces/ALI_Animation")`: `graph_count: 5`, `graphs: [IdleLayer, CycleLayer, StopLayer, StartLayer, PivotLayer]`.
- 각 graph 의 `animation_query.get_nodes`: 노드 1 개, `AnimGraphNode_Root` (Output Pose) 하나, `connected_pins: []` (빈 그래프).
- `blueprint_query.list_graphs("/Game/ALS/Characters/ABP_Layers")`: 12 그래프 (EventGraph + AnimGraph + GetBaseAnimBP + 9 콜백 등). **5 개 레이어 그래프는 여기에도 없다.**
- `blueprint_query.search_nodes(ABP_Layers, "PivotSM")` / `search_nodes(ABP_Layers, "Orientation Warping")`: 모두 `match_count: 0`.

해석: ALI_Animation 자체의 default impl 은 5 개 모두 **빈 Output Pose 1 노드** (= "default 가 비어 있는 인터페이스") 다. ABP_Layers 가 인터페이스를 구현한 5 개 그래프는 별도 enumerate 경로로 가야 하는데, Monolith 의 일반 enumerate / search 인덱스에는 포함되지 않는다.

따라서 본 섹션 5 의 PivotSM / Warping 분석은 Step 4 본문이 인용한 저자 코멘트 + 에디터 UI 직접 관찰 + 별도 그래프 호출의 1 차 자료에 의존한다. 자산 분석 자체는 본문에 명시 가능하지만, "Monolith MCP 단독으로 풀 노드 트리까지 재현" 은 현재 시점에도 불가능하다.

---

## 6. BS_Lean + LeanAngle 산출 + Debug 확장

> **자산.** 신규 `/Game/ALS/Characters/BS_Lean` (2D BlendSpace) + 신규 LeanAngle 산출 파이프라인 (`ABP_Base.SetRotationData` 후반부) + 확장 `S_DebugSetting` (필드 2 → 3) + 그에 연동된 `ABP_Base.Debug` 그래프 (노드 20 → 37).

### 6.1 BS_Lean 의 axis / sample 풀 메타

```
BS_Lean
  skeleton: /Game/Characters/Heroes/Mannequin/Meshes/SK_Mannequin
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

- 샘플 5 개 중 3 개가 같은 `Lean_Center` 시퀀스를 다른 Y(Gait) 좌표에 배치 = X=0 라인을 Y 전 범위에서 안정시키는 의도.
- 좌측 샘플 명이 `MM_Rifle_Jog_Leans_Left` (Leans, 끝의 s) 로 우측의 `MM_Rifle_Jog_Lean_Right` (단수) 와 비대칭 = 명명 일관성 문제일 가능성.

> **배경 노트.** 섹션 6.1 의 axis/sample 풀 메타는 본 분석에서 한 호출 (`animation_query.get_blend_space_info`) 로 emit 한 결과다. Step 4 작성 시점의 응답 폭에서는 별도 호출 + 직접 관찰의 조합이 필요했다.

### 6.2 LeanAngle 산출 파이프라인

`ABP_Base.SetRotationData(DeltaTime, LeanInterpScale=6)` 후반부에 추가된 산출. exec 체인에 연결돼 매 프레임 동작한다.

```
DeltaYaw (= CurrentYaw - LastFrameYaw)
   ▼ Safe Divide(DeltaYaw / DeltaTime)         # 초당 회전 속도 (deg/s)
   ▼ Safe Divide(각속도 / LeanInterpScale=6)
   ▼ float * float ◀── Select[LocomotionDirection]   # Forward=1, Backward=-1, R/L=0
   ▼ Clamp Angle(Min -90, Max 90)              # BS_Lean X 축 범위와 정확히 일치
   ▼ Set LeanAngle
```

핵심: `Clamp Angle` 의 `[-90, 90]` 이 `BS_Lean` 의 X 축 범위와 정확히 일치. 즉 BS_Lean 의 X 입력으로 쓰기 위해 설계된 변수다. `Select[LocomotionDirection]` 은 전후진 (±1) 에만 기울임을 주고 좌우 스트레이프 (0) 에는 안 준다.

### 6.3 합성 노드는 배치됐으나 Output Pose 미연결

CycleLayer 안에 `BS_Lean Blendspace Player` (`AnimGraphNode_BlendSpacePlayer`) 와 `Apply Additive` (`AnimGraphNode_ApplyAdditive`) 두 노드가 배치돼 있다. 그러나 **`Apply Additive` 의 출력이 CycleLayer 의 Output Pose 체인에 미연결**. 그래서 화면에는 Lean 포즈가 나오지 않는다.

| 구성 요소 | 상태 |
|---|---|
| BS_Lean BlendSpace 에셋 | **완성** |
| LeanAngle 변수 + 산출 파이프라인 | **완성** |
| BS_Lean Blendspace Player 노드 | 배치됨 |
| Apply Additive 노드 | 배치됨 |
| Apply Additive → Output Pose 연결 | **미연결** |
| 화면 반영 Lean | 미동작 |

섹션 5.5 의 enumerate 한계 때문에 위 미연결 사실 자체는 에디터 UI 직접 관찰 출처다.

### 6.4 S_DebugSetting 필드 표 + Debug 그래프 분기

| 필드 | type | default | 게이트 대상 |
|---|---|---|---|
| `ShowGaitData` | bool | True | `CurrentGait` 출력 |
| `ShowLocomotionData` | bool | True | 속도/각도/방향 + 화살표 |
| `DistanceMatching` | bool | True | 정지 예측 위치 시각화 (`Predict Ground Movement Stop Location` + `Draw Debug Capsule`) |

`ABP_Base.Debug` 그래프는 노드 20 → 37 로 커졌다. 세 갈래로 Sequence 를 치고 각각 `S_DebugSetting` 의 bool 로 게이트:

```
EventBlueprintBeginPlay or 그래프 진입
  └─ Sequence
        ├─ Branch( DebugSettings.ShowGaitData )
        ├─ Branch( DebugSettings.ShowLocomotionData )
        └─ Branch( DebugSettings.DistanceMatching )      # Step 4 신규 갈래
              └─ Predict Ground Movement Stop Location
                  ▼ Draw Debug Capsule (예측 정지 지점에 캡슐)
```

세 번째 갈래가 Step 4 신규로, Distance Matching 의 핵심 도구 (`Predict Ground Movement Stop Location`) 을 화면 위 캡슐로 직접 보여준다.

### 6.5 `S_GaitSetting` struct default (참조용)

`S_GaitSetting` struct 자체의 default 는 6 필드 모두 0.0 / false. 이 사실은 섹션 7.2 의 `GaitSettings` ImportText 직렬화의 생략 규칙 (struct default 와 일치하면 import text 에서 생략) 의 근거다.

| field | type | struct default |
|---|---|---:|
| MaxWalkSpeed | double | 0.000000 |
| MaxAcceleration | double | 0.000000 |
| BrakingDecelerationWalking | double | 0.000000 |
| BrakingFrictionFactor | double | 0.000000 |
| BrakingFriction | double | 0.000000 |
| bUseSeparateBrakingFriction | bool | False |

---

## 7. BP_LsCharacter + IMC / IA + GaitSettings 6 CMC 파라미터

> **자산.** `/Game/ALS/Characters/BP_LsCharacter` (Character 상속 Pawn) + `IMC_ALS` (Input Mapping Context) + 4 개 InputAction (`IA_Move / IA_Look / IA_Aim / IA_SwitchWeapon`) + `E_Weapon` 2 항목 enum. 본 프로젝트의 입력 진입점 묶음.

이 묶음은 Step 3 와 Step 4 사이에 자산 자체가 거의 변하지 않아 Step 4 본문이 별도 섹션으로 다루지 않았다. 그러나 본 심화 분석에서 **`BP_LsCharacter.GaitSettings: map<byte, S_GaitSetting>` 의 두 엔트리 6 CMC 파라미터 default** 가 본문에 명시되고, 그 값이 섹션 4.3 의 `Predict Ground Movement Stop Location` 의 정지 거동 차이의 근거가 된다.

### 7.1 BP_LsCharacter 메타

| 항목 | 값 |
|---|---|
| parent_class | `Character` |
| variable_count | 3 (`Gait`, `EquippedWeapon`, `GaitSettings`) |
| function_count | 2 (`SetGaitAndApplySettings`, 1) |
| graph_names | `EventGraph`, `DebugEventGraph`, `UserConstructionScript`, `SetGaitAndApplySettings` |
| has_tick | true |
| component_count | 1 (SpringArm > Camera, 추가로 inherited native 4 개) |

### 7.2 GaitSettings map default - 두 Gait 의 CMC 파라미터 차이

`BP_LsCharacter.GaitSettings: map<byte, S_GaitSetting>` 는 Gait 별로 CharacterMovementComponent (CMC) 의 6 파라미터를 묶어 두는 매핑이다. 맵의 키는 `E_Gait` enum (`NewEnumerator0 = Walking`, `NewEnumerator1 = Jogging`) 이며 `E_Weapon` 과는 무관하다.

| Gait | MaxWalkSpeed | MaxAcceleration | BrakingDecelerationWalking | BrakingFrictionFactor | BrakingFriction | bUseSeparateBrakingFriction |
|---|---:|---:|---:|---:|---:|---|
| `NewEnumerator0` (Walking) | 250.0 | 250.0 | 250.0 | 1.0 | 0.0 | false |
| `NewEnumerator1` (Jogging) | 800.0 | 500.0 | 1200.0 | 1.0 | 0.0 | true |

`BrakingFriction` 은 두 엔트리 모두 ImportText 직렬화에서 생략된다. `S_GaitSetting` struct default (섹션 6.5) 가 0.0 이라 struct default 와 일치하기 때문. `bUseSeparateBrakingFriction` 도 같은 이유로 Walking 엔트리에서 생략 = struct default `false` 와 일치.

> **배경 노트.** 본 섹션 7.2 의 두 엔트리 6 CMC 파라미터 default 는 본 분석에서 처음 본문화하는 사실이다. Step 4 작성 시점의 응답 폭에서는 map 타입 변수의 default 직렬화가 좁아 본 표를 그대로 정리하기 어려웠다.

### 7.3 정지 거동 차이의 함의

`BrakingDecelerationWalking` 만 봐도 Walking `250` vs Jogging `1200` 으로 4.8 배 차이가 난다. 여기에 `MaxWalkSpeed`, `BrakingFrictionFactor`, `bUseSeparateBrakingFriction` 까지 함께 달라져 섹션 4.2 의 `Predict Ground Movement Stop Location` 의 Gait 별 예측 결과에 영향을 준다.

실제 정지 거리의 비율은 CMC 의 braking 모델 (분리 friction 사용 여부 포함) 과 현재 속도에 의존하므로 단순 배수 단정은 피한다. 마찰을 무시한 거친 추정만 해도 `d = v² / (2a)` 기준:

| Gait | v | a (braking) | d (마찰 무시) |
|---|---:|---:|---:|
| Walking | 250 | 250 | 125 |
| Jogging | 800 | 1200 | 약 266.7 |

이 거친 추정만으로도 약 2.13 배. 실제 게임에서는 friction 항이 추가로 들어가 더 복잡한 곡선이 된다. 핵심: Walking 과 Jogging 의 정지 거리는 단순히 속도 차이만이 아니라 **6 CMC 파라미터의 묶음 차이** 가 만드는 결과다.

### 7.4 IMC + 4 InputAction

`IMC_ALS` 의 키 → IA 매핑은 자동 인덱서로 추출되지 않는다 (Research 문서 섹션 4-5 의 "IMC 키 매핑 0%" 한계). 본 분석에서도 `IMC_ALS` 자산 자체에서 노출되는 정보는 depends_on / referenced_by 의존성 그래프 까지다.

```
IMC_ALS  (InputMappingContext)
 ├─ depends_on (Hard)
 │    IA_Aim, IA_Look, IA_Move, IA_SwitchWeapon
 └─ referenced_by (Hard)
      BP_LsCharacter
```

4 InputAction:

| IA | value_type | consume_input | trigger_when_paused | triggers | modifiers |
|---|---|---|---|---|---|
| `IA_Move` | `Axis2D` | true | false | `[]` | `[]` |
| `IA_Look` | `Axis2D` | true | false | `[]` | `[]` |
| `IA_SwitchWeapon` | `Axis1D` | true | false | `[]` | `[]` |
| `IA_Aim` | `Boolean` | true | false | `[]` | `[]` |

네 IA 모두 trigger/modifier 가 빈 배열.

### 7.5 E_Weapon 2 항목 enum

| name | display_name | value |
|---|---|---|
| `E_Weapon::NewEnumerator0` | UnArmed | 0 |
| `E_Weapon::NewEnumerator1` | Pistol | 1 |

`BP_LsCharacter.EquippedWeapon` 의 default `NewEnumerator0` = UnArmed 와 일치. `IA_SwitchWeapon` 의 Switch on Int 가 0/1 분기로 이 두 항목에 대응.

---

## 8. 종합 + 환경 점검 + C++ + 다음 단계 + 부록

### 8.1 자산 별 Step 3 → Step 4 종합 diff

본 심화 분석에서 본문 (섹션 2~섹션 7) 으로 정리한 자산들의 한 줄 비교.

| 자산 | Step 3 | Step 4 | 변화 강도 | 본 분석 깊게 다룬 곳 |
|---|---|---|---|---|
| `LocomotionSM` (ABP_Base 내) | Idle/Cycle 2 상태 | 5 상태 + PivotAlias + 13 전이 | 큼 | [섹션 2](#2-locomotionsm---5-상태--13-전이의-룰-노드-트리) |
| `ABP_Base` | vars 8, graphs 13, BTSUA 5 단 | vars 24, graphs 16, BTSUA 6 단 | 큼 | [섹션 3](#3-abp_base-데이터-파이프라인---24-변수--btsua-6-단) |
| `ABP_Layers` | vars 3, graphs 5 | vars 12, graphs 12 | 큼 | [섹션 4](#4-abp_layers--start--stop--pivot-콜백--distance-matching) |
| `ALI_Animation` | 레이어 2 | 레이어 5 | 변경 | [섹션 4.4](#44-ali_animation-레이어-함수-2--5) + [섹션 5.5](#55-ali_animation-default-impl-의-빈-그래프--monolith-enumerate-한계) |
| 레이어 구현 그래프 | Sequence Player 단순 재생 | Orientation x5 + Stride x2 + PivotSM | 큼 | [섹션 5](#5-레이어-그래프--orientation--stride-warping--pivotsm) |
| `BS_Lean` | 없음 | 2D BlendSpace, 샘플 5 | 신규 (미연결) | [섹션 6.1](#61-bs_lean-의-axis--sample-풀-메타) ~ [섹션 6.3](#63-합성-노드는-배치됐으나-output-pose-미연결) |
| `S_DebugSetting` | 2 bool | 3 bool (+DistanceMatching) | 변경 | [섹션 6.4](#64-s_debugsetting-필드-표--debug-그래프-분기) |
| `LyraSkeleton.uproject` | AnimationLocomotionLibrary 미명시 | 활성화 | 설정 | [섹션 4.3](#43-distance-matching-의-전제-조건-실측) |
| `AN_TransitionToLocomotion` | 없음 | data-only AnimNotify | 신규 | [섹션 2.6](#26-신규-자산---an_transitiontolocomotion) |
| `S_DirectionalAnims` | (struct, Step 3 신규) | 동일 (4 회 재사용) | 무변 | [섹션 4.1](#41-12-변수---s_directionalanims-의-4-회-재사용) |
| `S_GaitSetting` | (struct 존재) | 동일 | 무변 | [섹션 6.5](#65-s_gaitsetting-struct-default-참조용) |
| `BP_LsCharacter` | vars 3, fns 2, graphs 4 | 동일 | 무변 (default 차이만 본 분석에 새로) | [섹션 7](#7-bp_lscharacter--imc--ia--gaitsettings-6-cmc-파라미터) |
| `ABP_Pistol` / `ABP_UnArmed` | 빈 자식 | 동일 | 무변 | (이번 분석 범위 밖, parent `ABP_Layers_C`) |

### 8.2 본 심화 분석에서 처음 본문화한 사실 (2 가지)

Step 4 본문이 적지 않았거나 적기 어려웠던 자산 사실 중, 본 분석이 처음으로 본문에 명시한 것은 다음 두 가지다.

1. **13 전이 룰 그래프의 노드 class + title 트리 ([섹션 2.3](#23-13-전이의-룰-노드-트리))**. 13 전이 각각의 룰 그래프 안의 노드를 TransitionResult 부터 PropertyAccess 까지 트리로 펼쳐, 어떤 변수/연산이 전이 조건에 들어가는지를 본문에서 검증할 수 있게 됐다.
2. **`BP_LsCharacter.GaitSettings` map 의 두 엔트리 6 CMC 파라미터 default ([섹션 7.2](#72-gaitsettings-map-default---두-gait-의-cmc-파라미터-차이))**. Walking `(250 / 250 / 250)` vs Jogging `(800 / 500 / 1200)` 차이가 [섹션 4.2](#42-12-그래프---신규-7-콜백) 의 정지 거동 차이의 근거임을 [섹션 7.3](#73-정지-거동-차이의-함의) 에서 거친 추정값까지 다뤘다.

추가로, 본 분석에서 새로 식별된 **분석 한계** 한 가지: **ALI_Animation 의 5 default impl 이 빈 Output Pose 1 노드이며, ABP_Layers 의 인터페이스 구현 그래프 (PivotSM / Warping 노드가 사는 곳) 가 Monolith 의 일반 enumerate / search 인덱스에 포함되지 않는다** ([섹션 5.5](#55-ali_animation-default-impl-의-빈-그래프--monolith-enumerate-한계)). 즉 PivotSM / Warping 의 풀 노드 트리는 본 시점에도 도구 단독으로는 재현할 수 없다.

### 8.3 Step 3 의 "다음 단계 4 후보" 해소도

| Step 3 가 적은 다음 단계 | Step 4 결과 |
|---|---|
| Stop/Start, Pivot, Lean | 대부분 해소. Stop/Start/Pivot 은 LocomotionSM 정식 상태로 완성. Lean 은 BS_Lean / LeanAngle / 합성 노드 배치까지 왔으나 Output 미연결로 미동작 |
| 방향 시퀀스 채우기 / BlendSpace 전환 | 부분 해소. S_DirectionalAnims 가 MM_Unarmed_* 시퀀스로 채워짐. 4 방향 이산 Select 는 유지, 그 위에 Orientation Warping 으로 임의 각도를 메움 |
| 방향 임계의 완전 외부화 (±50 / ±130 / DeadZone 20 을 struct/curve 로) | 미해소. 임계는 여전히 호출 노드 핀 리터럴. Step 4 가 더한 `LeanInterpScale`(6), Stride Warping 파라미터도 핀/변수 리터럴 - 외부화 대상이 늘었다 |
| Weapon ↔ AnimBP 동기화 + C++ 이식 | 미해소. Step 4 범위 밖. 여전히 전부 BP. `ABP_Pistol/UnArmed` 도 빈 껍데기 그대로 |

### 8.4 다음 단계 후보 (Step 4 의 5 + Step 4.5 의 2 = 7)

Step 4 섹션 08 의 5 후보는 그대로 유효.

1. **Lean 합성 연결.** `Apply Additive` → Output Pose 한 선만 잇고 X/Y 핀에 `LeanAngle` / `Gait` 연결.
2. **튜닝 상수의 외부화.** 방향 임계 + LeanInterpScale + Stride Warping 파라미터 + Play Rate Clamp 를 struct/curve 로.
3. **무기별 전이 레이어.** ABP_Pistol/UnArmed 빈 자식을 채워 Stop/Start/Pivot 의 무기별 오버라이드.
4. **Distance Curve 회귀 체크.** Stop/Start/Pivot 전이 시퀀스 24 개의 Distance 커브 + Uniform Indexable 압축 의존성 유지.
5. **Weapon ↔ AnimBP 동기화 + C++ 이식.** Step 1~3 로드맵의 미해소분. enum/struct/SM 로직 합류.

Step 4.5 가 추가:

6. **GaitSettings map 의 외부화 + Gait/무기 조합별 분기.** 섹션 7.2 의 6 CMC 파라미터를 사용자 수정 UX 로 제공할지, 그리고 `E_Weapon` 까지 함께 키로 사용해 무기별 다른 프로파일을 줄지 검토. 게임플레이 함의가 섹션 7.3 에 있다.
7. **Animation Layer Interface 의 default impl 채우기.** 현재 ALI_Animation 의 5 그래프가 빈 Output Pose 라 인터페이스를 구현하지 않은 ABP 가 ALI 를 호출할 때 안전한 기본 포즈가 없다. "default impl 에 IdleAnim 1 개 재생을 두는 게 표준" 인지 결정.

### 8.5 환경 점검 - 19 모듈 loaded vs 17 네임스페이스 registered

> 자산 분석이 아닌 **분석 환경 자체** 의 점검 메모.

본 LyraSkeleton 에디터 세션의 `monolith_discover()` live action namespace 는 17 개이며, `editor.get_module_status` 가 emit 한 19 개 MonolithXxx 모듈은 모두 `enabled=true` + `loaded=true` 다. 차이 2 개의 정체:

- `MonolithComboGraph`: 로드됨. `monolith_discover()` 응답의 `optional_modules` 에 `combograph` 가 `status: "not_installed"` 로 분리 emit. 의존 플러그인 ComboGraph (Fab marketplace) 미설치로 액션 0.
- `MonolithLogicDriver`: 로드됨. `monolith_discover(namespace="logicdriver")` 호출 시 `Unknown namespace: logicdriver` 응답. 의존 플러그인 Logic Driver Pro 미설치.
- 단 `bulk_fill_query.list_namespaces` 는 `combograph` / `logicdriver` 어댑터를 `available: true` 로 보고. bulk_fill 어댑터 레지스트리와 public query action 레지스트리가 서로 다른 게이트.

CHANGELOG 의 정적 release surface `1,344 actions / 19 namespaces` 는 두 게이트 어댑터까지 포함한 표기이며, 본 세션의 `1,265 / 17` 과 정확히 79 액션 (`combograph 13` + `logicdriver 66`) 차이로 맞물린다.

### 8.6 C++ 측 - Step 3 부터 동일한 게이트키퍼 수준

본 프로젝트의 `Source/` 는 5 개 파일이 전부다. Step 3 분석 시점과 동일.

```
Source/
  LyraSkeleton.Target.cs            # Game 타겟 (V6 / Unreal5_7)
  LyraSkeletonEditor.Target.cs      # Editor 타겟 (대칭)
  LyraSkeleton/
    LyraSkeleton.Build.cs           # Core, CoreUObject, Engine, InputCore, EnhancedInput
    LyraSkeleton.cpp                # IMPLEMENT_PRIMARY_GAME_MODULE
    LyraSkeleton.h
```

- `EnhancedInput` 만이 표준 5 모듈 위에 추가된 항목. Step 1 부터 이어진 입력 시스템 선택, Step 4 까지 변화 없음.
- BP 측이 의존하는 `AnimationLocomotionLibrary` 는 uproject 의 Plugins 활성화로만 들어오고, C++ 모듈은 헤더에 접근하지 않는다.

섹션 8.4 의 다음 단계 5 (Weapon ↔ AnimBP 동기화 + C++ 이식) 가 시작되면 이 5 파일에 enum / struct / SM 로직이 합류한다.

---

## 부록 A - 출처 매트릭스 (어느 호출이 어느 사실을 emit 했나)

| 본문 사실 | 호출 |
|---|---|
| 섹션 2.3 13 전이 룰 rule_nodes | `animation_query.get_transitions(asset=ABP_Base, machine=LocomotionSM)` |
| 섹션 3.1 24 변수 카테고리 별 | `animation_query.get_abp_variables(ABP_Base)` |
| 섹션 3.2 BTSUA exec 체인 6 단 | `animation_query.get_graphs(ABP_Base)` + `blueprint_query.get_graph_summary` 각 그래프 |
| 섹션 3.3 OnInitPivotState | `blueprint_query.get_graph_summary(ABP_Base, OnInitPivotState)` |
| 섹션 4.1 ABP_Layers 12 변수 | `animation_query.get_abp_variables(ABP_Layers)` |
| 섹션 4.2 신규 7 그래프 노드 수 | `animation_query.get_graphs(ABP_Layers)` + `blueprint_query.list_graphs` |
| 섹션 4.3 Distance Matching 전제 실측 | `animation_query.get_sequence_curves` + `project_query.get_asset_details.dependencies` + OS file read (`LyraSkeleton.uproject`) |
| 섹션 5.5 ALI default impl 빈 그래프 | `animation_query.get_abp_info(ALI_Animation)` + `get_nodes(*)` + `blueprint_query.list_graphs(ABP_Layers)` + `search_nodes(ABP_Layers, "PivotSM")` |
| 섹션 6.1 BS_Lean 풀 메타 | `animation_query.get_blend_space_info(BS_Lean)` |
| 섹션 6.4 S_DebugSetting | `project_query.get_asset_details(S_DebugSetting)` |
| 섹션 6.5 S_GaitSetting | `project_query.get_asset_details(S_GaitSetting)` |
| 섹션 7.1 BP_LsCharacter 메타 | `blueprint_query.get_blueprint_info(BP_LsCharacter)` |
| 섹션 7.2 GaitSettings map default | `blueprint_query.get_variables(BP_LsCharacter)` |
| 섹션 7.4 IMC / IA 4 행 | `project_query.get_asset_details(IMC_ALS/IA_Move/IA_Look/IA_Aim/IA_SwitchWeapon)` |
| 섹션 7.5 E_Weapon 항목 | `project_query.get_asset_details(E_Weapon)` |
| 섹션 8.1 자산 별 diff 표 | 위 호출들의 종합 |
| 섹션 8.5 모듈 vs 네임스페이스 / 게이트 검증 | `editor_query.get_module_status()`, `monolith_discover()`, `monolith_discover(namespace="logicdriver")`, `bulk_fill_query.list_namespaces` + OS file read (`Plugins/Monolith/CHANGELOG.md`, `Plugins/Monolith/Monolith.uplugin`) |
| 섹션 8.6 C++ 모듈 | OS file read (`Source/*.cs`, `*.cpp`) |

## 부록 B - 본 분석에서 사용하지 않은 도구 신기능 (의도적 비범위)

- `describe.schema` / `list_targets` / `action_schema`: 본 read 전용 분석에는 어댑터 스키마 인트로스펙트가 필요 없었다. write 작업 (예: 섹션 8.4 의 GaitSettings 외부화) 단계에서 `describe.schema` 로 ImportText 그래마 확인 → `bulk_fill.apply` 로 일괄 쓰기, 가 권장 흐름.
  - 호출 시 `target_namespace` 가 required. 빈 params 호출은 `Missing required param(s): [target_namespace]` 로 거절된다. 예: `describe_query(action="list_targets", params={"target_namespace":"blueprint"})`.
- `bulk_fill.apply`: 동일 이유.
- `blueprint.get_cdo_properties` / `describe_cdo_schema`: 본 분석에선 `get_variables` 의 default_value 직렬화로 충분.
- `animation.add_anim_graph_node` / `connect_anim_graph_pins` 등 write 액션 일체.
- `project.list_gameplay_tags` / `search_gameplay_tags`: 본 프로젝트는 GAS 미사용.

이상.
