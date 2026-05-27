# Step 4 - Start/Stop/Pivot 전이 상태 + Distance Matching + Warping

Step 3 의 4 방향 Cycle 위에 **이동의 시작 / 정지 / 방향 전환** 을 LocomotionSM 의 정식 상태로 추가한다. Distance Matching 으로 발 미끄러짐 (foot sliding) 을 제거하고, 레이어 그래프마다 Orientation / Stride Warping 으로 적은 시퀀스만으로 임의 방향 / 보폭을 메운다. PivotLayer 안에는 전용 중첩 State Machine 을 둔다.

## 이 Step 이 적합한 프로젝트

Start / Stop / Pivot 전이 상태 + Distance Matching + Orientation / Stride Warping + 중첩 SM. 캐릭터 움직임의 디테일이 게임의 셀링 포인트가 되는 프로젝트.

### 발 미끄러짐이 시각적으로 두드러지는 게임

- **AAA 캐릭터 액션** (소울라이크, 시네마틱 액션, 오픈월드 RPG): 카메라가 캐릭터에 가깝고 발 / 골반의 디테일이 잘 보임. 발 미끄러짐이 몰입을 깨는 시점.
- **모션 캡처 자산 기반 게임**: 모캡 시퀀스의 사실적 움직임을 발 위치 정확도로 살림. 모캡 예산을 들인 만큼 결과가 화면에 정확히 옮겨져야 가치가 있음.
- **사실적 캐릭터 / 휴머노이드 시뮬레이션**: 발 미끄러짐이 즉각 어색하게 보이는 사실주의 어드벤처.
- **3 인칭 클로즈업 카메라** 의 액션 RPG: 캐릭터의 발 위치가 카메라 시야의 일부.

### 빠른 방향 전환이 게임플레이 핵심인 액션

- **빠른 피벗 / 급선회가 빈번한 PvP 슈터 / 액션** (퀘이크 / 언리얼 토너먼트 류 아레나 슈터, 전술 슈터의 빠른 코너링): 피벗 도중 또 다른 피벗이 들어오는 경기형 PvP. `PivotSM` 의 핑퐁 구조가 모션 끊김을 막음.
- **격투 / 액션 게임의 캐릭터 컨트롤** 이 정밀해야 하는 콘텐츠: Start / Stop / Pivot 전이의 정확한 거리 매칭이 입력 반응성과 시각적 일관성 모두를 잡음.

### 적은 시퀀스 예산으로 임의 각도 / 보폭을 메우려는 인디

- **Warping (Orientation + Stride)** 만 부분 도입해도 4 방향 시퀀스로 360 도 / 다양한 속도 표현 가능. Distance Matching 까지 안 가도 Warping 부분 효과는 큼.
- 모캡 예산이 없는 인디 게임이 적은 자산으로 큰 표현 폭을 내고 싶을 때.

### 적합하지 않은 경우

- **카메라가 멀어 발 디테일이 안 보이는** 게임 (RTS, 거시 전략, 탑다운 RPG): Distance Matching 의 시각적 이득이 미미.
- **`AnimationLocomotionLibrary` 플러그인 사용이 제한** 되는 환경 (특수 패키지 / 일부 콘솔 정책): Distance Matching 핵심 함수가 빠짐. 시퀀스 직접 시간 제어 같은 대체 구조 검토 필요.
- **시퀀스에 Distance 커브 작업이 어려운** 자산 사양: Distance Curve Modifier 적용 + Uniform Indexable 압축 변경이 24 개 전이 시퀀스 모두에 필요. 자산 워크플로 정비가 선행되어야 도입 가치 발생.
- **단순 캐주얼 / 모바일 캐주얼**: 발 미끄러짐을 사용자가 신경 쓰지 않는 시점 / 톤. 본 Step 의 복잡도가 비용 대비 효과 낮음.

### 권장 사양

| 항목 | 권장 |
|---|---|
| 시퀀스 자산 | Walk / Jog 의 Cycle 4 방향 + Stop 4 방향 + Start 4 방향 + Pivot 4 방향. 최소 32 개 시퀀스 + Idle 1 개 |
| 자산 가공 | 24 개 전이 시퀀스 모두에 Distance 커브 (Animation Data Modifiers > Distance Curve Modifier) + Uniform Indexable 압축 적용 |
| 엔진 | UE 5.x + **`AnimationLocomotionLibrary` 플러그인 활성화** |
| 스켈레톤 | Spine Bones / IK Foot Bones 가 정의된 스켈레톤 (Warping 동작 전제) |
| 팀 사양 | 애니메이터 + 테크니컬 애니메이터가 협업 가능한 팀 규모. Distance 커브 / 압축 설정이 자산 파이프라인의 일부 |
| 선행 Step | [Step 1](./LectureStep1.md), [Step 2](./LectureStep2.md), [Step 3](./LectureStep3.md) 모두 |
| 후속 / 심화 | 본 Step 의 자산 메타를 더 깊이 보려면 [Step 4.5](./LectureStep4.5.md) (13 전이 룰 노드 트리, 24 변수 카테고리, GaitSettings default 등) |

## 결과물 한눈에

- 캐릭터가 멈춰 있다 출발 → Start 시퀀스 → Cycle
- 달리다 멈춤 → Stop 시퀀스 (발이 미끄러지지 않고 정확한 지점에서 멈춤)
- 달리는 중 급선회 → Pivot 시퀀스 (감속 → 회전 → 가속이 끊김 없이 이어짐)
- 적은 수의 4 방향 시퀀스만으로 모든 임의 각도 / 보폭 표현
- 회전 시 기울임용 BS_Lean 에셋 + LeanAngle 산출 (Output 연결은 미완)

### 이번 Step 의 신규 / 변경 자산

| 자산 | 종류 | 상태 |
|---|---|---|
| `AN_TransitionToLocomotion` | AnimNotify (data-only) | 신규. Pivot 시퀀스의 종료 시점 표시 |
| `BS_Lean` | BlendSpace (2D) | 신규. axis = LeanAngle / Gait, 5 샘플 |
| `LocomotionSM` (ABP_Base 내) | 상태 머신 | 2 → 5 상태 + 13 전이로 확장 |
| `ALI_Animation` | 인터페이스 | 레이어 함수 2 → 5 (StopLayer / StartLayer / PivotLayer 추가) |
| `ABP_Base` 변수 | - | 4 → 24 (가속도 / Yaw / Lean / Gait 전이 데이터 추가) |
| `ABP_Layers` 변수 | - | 3 → 12 (Stop / Start / Pivot 의 방향 묶음 추가) |
| `ABP_Layers` 그래프 | - | 5 → 12 (OnInit / OnUpdate 콜백 6 개 추가) |
| `S_DebugSetting` | 구조체 | 필드 2 → 3 (`DistanceMatching` 추가) |
| `LyraSkeleton.uproject` | 프로젝트 설정 | `AnimationLocomotionLibrary` 플러그인 활성화 |

---

## 1. 중심 기능 (1) - LocomotionSM 5 상태 + 13 전이

### 1.1 상태 다이어그램

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
```

`PivotAlias` 는 상태 별칭 (State Alias). 여러 상태에서 Pivot 진입을 한 룰로 묶기 위한 가상 노드.

### 1.2 각 상태는 ALI 레이어 호출만

[Step 1 부터의 Linked Anim Layer 패턴](./LectureStep1.md) 이 그대로 확장됐다. 5 상태 모두 내부가 2 노드 (`Output Animation Pose` + `Linked Anim Layer`). 무거운 로직은 ABP_Layers 의 OnInit / OnUpdate 콜백으로 분리.

| ALI 레이어 함수 | 신설 시점 | 대응 SM 상태 |
|---|---|---|
| `IdleLayer` | Step 1 | Idle |
| `CycleLayer` | Step 2 | Cycle |
| `StopLayer` | Step 4 | Stop |
| `StartLayer` | Step 4 | Start |
| `PivotLayer` | Step 4 | Pivot |

### 1.3 13 전이의 룰 패턴

| 패턴 | 어느 전이에서 | 예 |
|---|---|---|
| **속도 / 가속도 0 근처** | Stop → Idle, Start → Cycle | `Nearly Equal ← Vector Length XY ← Get CharacterVelocity2D` |
| **방향 변화 검출** | Start → Cycle | `Not Equal (Enum) ← Get LastLocomotionDirection, Get LocomotionDirection` |
| **Gait 변화 검출** | Start → Cycle | `Get bIsGaitChanged` |
| **Pivot 판정 (내적 비교)** | PivotAlias → Pivot, Pivot → Cycle | `float < float ← Dot Product ← Normalize x2` |
| **AnimNotify 트리거** | Pivot → Cycle (한 분기) | `Was Anim Notify Triggered in Source State` |

전체 13 전이의 룰 노드 트리는 [Step 4.5 강의](./LectureStep4.5.md) 에서 펼친다.

### 1.4 MaxTransitionsPerFrame 디버깅 일지

LocomotionSM 노드의 `MaxTransitionsPerFrame` 을 엔진 기본값 **3 에서 1 로** 낮춰 두었다. 저자 코멘트 요지:

> Start → Cycle 전이가 "직전 프레임 방향 vs 현재 프레임 방향" 을 비교하는데, 한 프레임에 전이 3 회 평가시 2 회차 평가 때 "직전 프레임" 변수가 이미 갱신돼 비교가 깨졌다. 결과: Forward 만 정상, 좌우 / 후방에서 Start 스킵. 해결은 평가 횟수를 1 로 제한.

**학습 포인트**: 프레임당 1 회 갱신되는 변수를, 프레임당 여러 번 평가되는 곳에서 읽으면 시간 의미가 깨진다. 캐싱 변수의 갱신 주기와 소비 주기가 같아야 한다.

---

## 2. 중심 기능 (2) - Distance Matching

### 2.1 무엇을 해결하나

[Step 3 의 Cycle](./LectureStep3.md) 은 `Sequence Player` 가 자동으로 시간을 진행시킨다. 출발 / 정지 / 방향 전환 시 다음 문제가 발생:

- 캐릭터가 정확한 거리에서 멈추지 않고 시퀀스 끝까지 계속 미끄러짐
- 시퀀스의 발 위치와 실제 캐릭터 위치가 어긋남

**Distance Matching** 은 시퀀스의 재생 시간을 캐릭터의 실제 이동 거리에 묶어 발 미끄러짐을 제거한다.

### 2.2 핵심 함수 4 개 (`AnimationLocomotionLibrary` 플러그인)

| 함수 | 역할 |
|---|---|
| `Predict Ground Movement Stop Location` | "입력 없이 자연 감속할 경우 최종적으로 멈출 상대 위치" 예측 |
| `Predict Ground Movement Pivot Location` | "피벗 도중 가장 멀리 도달했다가 되돌아오는 피벗 지점" 예측 |
| `Distance Match to Target` | 목표 지점까지 남은 거리에 대응하는 정확한 프레임 위치로 재생 시간 정렬 |
| `Advance Time by Distance Matching` | 실제 이동 거리를 기준으로 재생 시간 진행 (Play Rate Clamp 로 제한) |

저자 코멘트 (`Predict Ground Movement Stop Location`):

> 캐릭터의 현재 속도 (Velocity) 와 무브먼트 컴포넌트의 마찰 / 감속 설정값들을 입력받아, 캐릭터가 입력 없이 자연 감속할 경우 최종적으로 멈추게 될 상대 위치 (오프셋 벡터) 를 예측해 반환

### 2.3 전제 조건 2 가지

Distance Matching 이 동작하려면 시퀀스가 다음 둘을 만족해야 한다.

1. **각 전이 시퀀스가 `Distance` 커브를 가진다.** Animation Data Modifiers > Distance Curve Modifier 로 생성. 시퀀스의 "0 cm 부터 끝까지 진행한 거리" 를 시간에 매핑한 커브
2. **Curve Compression 이 `UniformIndexableCurveCompressionSettings`** 여야 한다. 런타임이 distance curve 를 인덱스로 빠르게 역조회하기 위해

Stop / Start / Pivot 전이 시퀀스 **24 개 모두 두 조건 충족**.

추가 전제: `LyraSkeleton.uproject` 에 **`AnimationLocomotionLibrary` 플러그인 활성화**.

### 2.4 동작 예 - 정지 (OnUpdateStopAnims)

```
매 프레임:
   1. Predict Ground Movement Stop Location
      (CMC 의 마찰/감속 설정 + 현재 Velocity 입력)
      → 예측된 정지 지점 (월드 오프셋 벡터)

   2. 캐릭터의 현재 위치 → 정지 지점까지의 거리 산출

   3. Distance Match to Target(SequenceEvaluator, 거리)
      → Stop 시퀀스의 Distance 커브에서 "이 거리에 해당하는 시간" 역조회
      → SequenceEvaluator.ExplicitTime 으로 설정

결과: 캐릭터가 실제로 그 거리를 이동하는 동안 시퀀스도 같은 진행도로 재생.
발이 정확히 정지 지점에 닿으면서 멈춤.
```

`Sequence Player` 가 아니라 `Sequence Evaluator` 를 쓴다 (다음 섹션 참조).

---

## 3. 중심 기능 (3) - Orientation / Stride Warping

### 3.1 Orientation Warping (5 노드, 4 레이어)

저자 코멘트 요지:

> Orientation Warping 은 하체 (다리 / IK 발) 를 실제 이동 방향으로 회전시키고, 동시에 척추 (spine) 를 반대로 카운터 회전시켜 상체는 조준 방향 바라보게 만든다.

배치:

| 레이어 | Orientation Warping 노드 수 |
|---|---|
| CycleLayer | 1 |
| StopLayer | 1 |
| StartLayer | 1 |
| PivotLayer (PivotSM 의 A / B 각각) | 2 |

[Step 3 의 4 방향 이산 시퀀스](./LectureStep3.md) 풀 위에 임의 각도를 메우는 기법. 시퀀스가 Forward 라도 캐릭터는 30° 방향으로 갈 수 있고, Orientation Warping 이 본을 회전시켜 그 차이를 메운다.

주의:

- Spine Bones / IK Foot Bones 가 비어 있으면 동작 안 함
- Min Root Motion Speed Threshold 이하에서는 자동 억제

### 3.2 Stride Warping (2 노드, Cycle / Start)

저자 코멘트 요지:

> Stride Warping 은 골반 (Pelvis) 기준으로 발 (IK foot) 의 앞뒤 간격을 실시간으로 늘리거나 줄여서, 애니메이션의 보폭을 실제 이동 속도에 맞춘다. 보통 Orientation Warping 다음, 발 IK 앞에 배치한다.

`StartLayer` 에서는 `StrideWarpingStartAlpha` 가 시간 진행에 따라 0 → 1 로 키워져 진입 직후의 보폭 불일치를 부드럽게 한다.

`OnUpdateStartAnims` 의 `Map Range Clamped` 가 알파를 산출 (저자 코멘트):

> 현재 진행 시간 (Explicit Time) 을 보폭 워핑 알파값으로 변환. "시작 애니메이션이 진행될수록 보폭 워핑을 0% 에서 100% 까지 점진적으로 켜는" 값을 만듭니다.

### 3.3 Cycle 과 Start 만 Stride Warping 이 있는 이유

- **Cycle**: 지속 이동 - 캐릭터 속도와 시퀀스 보폭이 늘 일치해야 함
- **Start**: 가속 구간 - 시작 시 보폭이 작다가 점점 늘어남
- **Stop**: 감속 구간 - 보폭이 변하지만 Distance Matching 이 더 강한 도구라 충분
- **Pivot**: 방향 전환 - 보폭보다 회전이 핵심

---

## 4. 중심 기능 (4) - PivotSM (레이어 안의 중첩 State Machine)

### 4.1 왜 별도 SM 인가

저자 코멘트 (원문 요지):

> Cycle 애니메이션은 단순히 레이어 단위로 애니메이션만 선택하는 방식. Pivot 상태는 피벗 도중에 또 다른 피벗이 시작될 수 있음. Pivot 애니메이션은 감속 → 회전 → 가속이 함께 있어 단순 교체는 모션 끊김. 전용 State Machine 에서 처리.

Cycle 은 시퀀스를 갈아 끼우면 끝이지만, Pivot 은 한 시퀀스가 끝나기 전에 다음 피벗이 들어올 수 있다. 단순히 시퀀스를 set 하면 진행 중인 회전 애니메이션이 끊긴다.

### 4.2 핑퐁 버퍼 구조

```
PivotSM (PivotLayer 안의 중첩 State Machine)
  상태: A, B (AnimStateNode 2 개)
  전이: WantToPivot (A ↔ B 핑퐁)
  각 상태 내부:
     Sequence Evaluator → Orientation Warping → Output Animation Pose
  레이어 출력:
     PivotSM → Inertialization → Output Pose
```

동작:

1. 첫 피벗 → 상태 A 가 피벗 시퀀스 재생
2. 재생 중 또 피벗 → `WantToPivot` 전이로 B 로 이동, B 가 새 피벗 재생
3. 재생 중 또 피벗 → 다시 A 로 (핑퐁)

상태 한 쪽이 피벗 애님을 재생하는 동안 다른 쪽은 다음 피벗을 받을 준비를 한다. **이전 피벗과 새 피벗이 끊기지 않게 이어진다**.

### 4.3 Dot Product 각도 대응 (저자 참조표)

PivotSM 의 전이 룰이 내적 (Dot Product) 으로 방향 일치를 판정. 저자가 BP 안에 그려둔 대응표:

| Dot Product | 각도 |
|---:|---:|
| 1.0 | 0° (같은 방향) |
| 0.5 | 60° |
| 0.0 | 90° (직각) |
| -0.5 | 120° |
| -1.0 | 180° (정반대) |

전이 룰 `float < float ← Dot Product ← Normalize x2` 가 "두 단위 벡터의 내적이 임계보다 작으면" = "방향 정렬이 임계 각도보다 벌어졌으면" 으로 읽힌다.

---

## 5. 꼭 알아야 할 기능 - Sequence Player vs Sequence Evaluator

| | Sequence Player | Sequence Evaluator |
|---|---|---|
| 시간 흐름 | 자동 (재생 속도에 따라) | 외부가 `Explicit Time` 으로 지정 |
| Loop | 가능 | 불가 (또는 외부가 처리) |
| Distance Matching 호환 | 어려움 | **표준 조합** |
| 사용 위치 (이번 Step) | CycleLayer, IdleLayer | StopLayer, StartLayer, PivotLayer |

### 왜 둘로 나뉘는가

`Sequence Player` 는 "그냥 재생" - DeltaTime 만큼 시간이 자동으로 흐른다. 지속 이동 (Cycle) 처럼 시간이 일정하게 흐르면 충분.

`Sequence Evaluator` 는 "외부가 시간을 결정" - `ExplicitTime` 핀이 입력. Distance Matching 처럼 "이 시점에 정확히 이 프레임을 보여줘야 한다" 가 필요할 때 쓴다.

### 사용 패턴

```
StopLayer
  Sequence Evaluator (Explicit Time 핀)
       ▲
       │
  Distance Match to Target
       │  ← 남은 거리 입력
       └ 시퀀스의 Distance 커브에서 "이 거리에 해당하는 시간" 역조회
```

`Sequence Evaluator + Distance Match to Target` 이 Distance Matching 의 **표준 노드 조합**.

### OnInit 의 Set Explicit Time = 0

저자 코멘트 (`OnInitStopAnims` 의 `Set Explicit Time`):

> Sequence Evaluator 의 재생 위치를 0 초로 리셋합니다. 정지 애니메이션을 처음부터 시작하기 위함

레이어 진입 시 Evaluator 의 시간을 0 으로 초기화해야 같은 시퀀스가 끊임없이 재생되지 않는다. 6 개 OnInit 콜백 모두 이 패턴.

---

## 6. 꼭 알아야 할 기능 - OnInit / OnUpdate 쌍 구조

### 6.1 디버깅 일지 - 캐싱 타이밍

`OnInitStartAnims` / `OnInitPivotAnims` 의 PropertyAccess 노드에 저자가 남긴 코멘트 (원문):

> fix: ABP_Base 에 캐싱된 Acceleration 2D 가 항상 0 이라 직접 CMC 에서 Get

> 애니메이션 State 호출 타이밍이, BlueprintThreadSafeUpdateAnimation 함수 호출보다 먼저 호출되어 캐싱되는 Data 를 사용할 수 없는 것으로 추정. 추정이 맞는 것으로 확인됨, 근거 3 가지.
> 1. UE5 애니메이션은 게임 스레드 캐싱 → 워커 스레드 평가의 2 단계 구조이고, 노드 함수 (OnBecomeRelevant) 와 캐싱 갱신의 순서가 어긋날 수 있음.
> 2. 전이 / 노드 평가 시점에 변수가 기대대로 반영 안 되는 건 알려진 이슈.
> 3. 라이라 자체가 "진입 시 선택 / 업데이트 시 갱신" 을 분리하고 진입 시점 데이터 유효성을 신경 써 설계.

### 6.2 OnInit / OnUpdate 책임 분담

이 디버깅 교훈이 그래프 구조로 굳었다. 6 개 신규 콜백이 예외 없이 OnInit + OnUpdate 쌍.

| 콜백 종류 | 호출 시점 | 책임 | 데이터 출처 |
|---|---|---|---|
| `OnInit*` | 레이어 진입 시 1 회 | 무엇을 재생할지 (방향 / Gait 시퀀스 선택) | CMC 직접 읽기 (캐싱 미신선) |
| `OnUpdate*` | 매 프레임 | 어디를 재생할지 (Distance Matching 시간) | ABP_Base 캐싱값 (신선) |

### 6.3 신규 7 콜백

| 그래프 | 노드 수 | 역할 |
|---|---:|---|
| `OnInitStopAnims` | 17 | Stop 진입 시 방향별 시퀀스 선택 + Explicit Time = 0 |
| `OnUpdateStopAnims` | 27 | `Predict Ground Movement Stop Location` + `Distance Match to Target` |
| `OnInitStartAnims` | 25 | Start 진입 시 가속 방향으로 시퀀스 선택 + Inertial Blending |
| `OnUpdateStartAnims` | 18 | `Advance Time by Distance Matching` + Stride Warping Alpha 산출 |
| `OnInitPivotAnims` | 23 | Pivot 진입 시 시퀀스 선택 + Inertial Blending |
| `OnUpdatePivotAnims` | 56 | 매 프레임 피벗 재판정 + `Predict Ground Movement Pivot Location` + Distance Matching |
| `CalculateLocomotionDirection` | 21 | 진입용 5 입력 함수 (DeadZone 없음, ABP_Base 의 7 입력과 별개) |

### 6.4 두 개의 CalculateLocomotionDirection

| 위치 | 입력 수 | 용도 |
|---|---|---|
| `ABP_Base` (Step 3) | 7 (DeadZone 20 포함) | BTSUA 의 매 프레임 판정 (히스테리시스) |
| `ABP_Layers` (Step 4) | 5 (DeadZone 없음) | OnInit 콜백의 진입 순간 일회성 판정 |

같은 이름 다른 함수. OnInit 은 캐싱값을 못 쓰니 ABP_Base 의 히스테리시스 함수도 못 쓴다 → 자체 단순 버전을 새로 만들었다.

---

## 7. 꼭 알아야 할 기능 - AnimNotify 기반 전이 트리거

### 7.1 AN_TransitionToLocomotion 자산

```
AN_TransitionToLocomotion (data-only AnimNotify)
  parent : AnimNotify
  graph  : 0
  var    : 0
  fn     : 0
```

내용이 없는 빈 마커. Pivot 시퀀스의 특정 시점에 배치된다.

### 7.2 전이 룰에서 사용

`Pivot → Cycle` 의 한 분기 (#12) 가 이 노티파이를 보고 전이한다.

```
TransitionResult
   ← AnimGetter "Was Anim Notify Triggered in Source State (Pivot)"
```

**AnimGetter** 는 그래프 노드의 한 종류. "현재 SM 의 source state (= Pivot) 안에서 X 노티파이가 트리거됐는가" 같은 SM 컨텍스트 질문을 표현한다.

### 7.3 왜 노티파이로 전이를 트리거하나

피벗 시퀀스의 후반부 (예: 회전이 끝나고 가속에 들어가는 시점) 에 노티파이를 배치하면, 그 시점에 도달했을 때 자동으로 Cycle 로 전이된다. 즉:

- 시퀀스 작성자가 "여기서 다음 상태로 가야 한다" 를 시퀀스 타임라인에 직접 표시
- SM 의 전이 룰은 그 마커를 보고 전이만 수행
- 시퀀스 길이를 바꿔도 전이 시점이 자동으로 따라간다

`Pivot → Cycle` 은 노티파이 외에도 두 분기 (방향 정렬, 가속 종료) 가 있어서 어느 한 조건이라도 만족하면 전이.

---

## 8. ABP_Base 의 24 변수 + BTSUA 6 단

### 8.1 24 변수 카테고리 별

| 카테고리 | 변수 |
|---|---|
| `VelocityData` | `CharacterVelocity`, `CharacterVelocity2D` |
| `LocationData` | `WorldLocation`, `LastWorld Location`, `DeltaLocation` |
| `RotationData` | `WorldRotation`, `CurrentYaw`, `LastFrameYaw`, `DeltaYaw`, `LeanAngle` |
| `AccelerationData` (신설) | `Acceleration`, `Acceleration2D`, `PivotAcceleration2D`, `bIsAccelerating` |
| `LocomotionData` | `LocomotionAngle`, `LocomotionDirection`, `LastLocomotionDirection`, `AccelerationLocomotionAngle`, `AccelerationLocomotionDirection` |
| `Gait` | `CurrentGait`, `IncommingGait`, `LastGait`, `bIsGaitChanged` |
| `Debug` | `DebugSettings` |

신규 카테고리 `AccelerationData` 의 4 변수가 **Pivot 감지의 핵심 채널**. 모든 변수의 default 가 빈 문자열 (런타임 캐싱).

### 8.2 BTSUA exec 체인 6 단

```
BlueprintThreadSafeUpdateAnimation(DeltaTime)
  → SetLocationData(DeltaTime)
  → SetVelocityData
  → SetAccelerationData               # 신규
  → SetRotationData(DeltaTime, LeanInterpScale=6)
  → UpdateOrientationData
  → SetCharacterStates                # 신규
```

| 함수 | 역할 |
|---|---|
| `SetAccelerationData` | CMC.GetCurrentAcceleration + 2D 정규화 + `bIsAccelerating` 판정 |
| `SetCharacterStates` | `bIsGaitChanged`, `LastLocomotionDirection`, `LastGait` 비교 set (전이 룰 입력 변수) |

### 8.3 Velocity vs Acceleration - 왜 가속도가 신설됐나

Step 3 까지는 `Velocity` (실제 움직이는 방향) 만 봤다. Step 4 는 `Acceleration` (플레이어가 입력한 방향) 을 별도 채널로 둔다. 둘이 갈라지는 3 시점:

| 시점 | Velocity | Acceleration |
|---|---|---|
| 출발 순간 | 아직 0 | 입력 시작 (방향 있음) |
| 정지 순간 | 관성으로 0 아님 | 0 (입력 뗌) |
| 급선회 | 옛 방향 | 새 방향 |

이 두 채널의 갈라짐을 보는 것이 **Pivot 감지의 핵심**.

### 8.4 OnInitPivotState 그래프

Pivot 상태 진입 순간에 한 번 호출. 본질은 `Set PivotAcceleration2D = Acceleration2D` (진입 순간의 입력 방향 박제). 이 값이 `Pivot → Cycle` 전이 룰의 좌변으로 들어가 "피벗 진입 시점의 입력 방향에 속도가 정렬됐는지" 를 판정한다.

---

## 9. ABP_Layers 의 12 변수 - S_DirectionalAnims 4 회 재사용

[Step 3 의 `S_DirectionalAnims`](./LectureStep3.md) 를 손대지 않고 그대로 4 번 더 인스턴스화.

| 카테고리 | 변수 |
|---|---|
| `Idle` | `IdleAnim` (AnimSequenceBase) |
| `Cycle` | `WalkCycleAnims`, `JogCycleAnims` (S_DirectionalAnims) |
| `Stop` | `WalkStopAnims`, `JogStopAnims` |
| `Start` | `WalkStartAnims`, `JogStartAnims` |
| `Pivot` | `WalkPivotAnims`, `JogPivotAnims` |
| `Default` | `StrideWarpingStartAlpha` (0.0), `StrideWarpingBlendInStartOffset` (0.15), `StrideWarpingBlendInDurationScaled` (0.20) |

### Pivot 묶음의 의도된 "반대 매핑"

`WalkPivotAnims` / `JogPivotAnims` 의 4 방향이 일반 매핑과 반대로 채워져 있다.

| 방향 인덱스 | 일반 (Cycle/Stop/Start) | Pivot (반대) |
|---|---|---|
| Forward (0) | `*_Fwd` 시퀀스 | `*_Bwd_Pivot` 시퀀스 |
| Backward (1) | `*_Bwd` | `*_Fwd_Pivot` |
| Right (2) | `*_Right` | `*_Left_Pivot` |
| Left (3) | `*_Left` | `*_Right_Pivot` |

피벗이 "현재 진행 방향과 새 가속 방향의 관계" 로 선택되는 동작이라 의도된 매핑. 예: 앞으로 달리다 뒤로 가속 → 진행 방향 (Forward) 에 매핑된 시퀀스가 `Bwd_Pivot` (뒤로 회전하며 멈추는 시퀀스).

---

## 10. BS_Lean + LeanAngle 산출 + Debug

### 10.1 BS_Lean (신규 자산)

```
BS_Lean (2D BlendSpace)
  axis_x: LeanAngle  [-90, 90]   grid_div=2  snap=true
  axis_y: Gait       [  0,  1]   grid_div=2  snap=true
  samples (5):
    0: MM_Rifle_Jog_Lean_Center    (x= 0, y=0.5)
    1: MM_Rifle_Jog_Lean_Center    (x= 0, y=1.0)
    2: MM_Rifle_Jog_Lean_Center    (x= 0, y=0.0)
    3: MM_Rifle_Jog_Leans_Left     (x=-90, y=1.0)
    4: MM_Rifle_Jog_Lean_Right     (x= 90, y=1.0)
```

X=0 라인을 Y 전 범위에서 안정시키기 위해 같은 `Lean_Center` 시퀀스를 3 좌표에 배치.

### 10.2 LeanAngle 산출 파이프라인 (`ABP_Base.SetRotationData` 후반부)

```
DeltaYaw (= CurrentYaw - LastFrameYaw)
   ▼ Safe Divide(DeltaYaw / DeltaTime)          # 초당 회전 속도 (deg/s)
   ▼ Safe Divide(각속도 / LeanInterpScale=6)
   ▼ float * float ◀── Select[LocomotionDirection]   # F=1, B=-1, R/L=0
   ▼ Clamp Angle(Min -90, Max 90)               # BS_Lean X 축 범위와 정확히 일치
   ▼ Set LeanAngle
```

저자 코멘트:

- `LeanInterpScale`: "각속도 (deg/s) 를 '기울임 각도' 로 변환하는 스케일 / 감도 보정 상수. 6 보다 크면 덜 기울어짐 (차분), 6 보다 작으면 더 기울어짐 (과장)"
- `float * float ← Select[LocomotionDirection]`: "뒤로 달릴 때 반전"
- `Clamp Angle`: "기울임 한계 제한"

`Clamp Angle` 의 `[-90, 90]` 이 `BS_Lean` 의 X 축 범위와 정확히 일치. BS_Lean 의 X 입력으로 쓰기 위해 설계.

### 10.3 합성 노드는 배치됐으나 Output Pose 미연결

CycleLayer 안에 `BS_Lean Blendspace Player` + `Apply Additive` 두 노드가 배치돼 있지만 **Apply Additive 의 출력이 Output Pose 체인에 미연결**. 화면에 Lean 포즈가 안 나오는 미완 상태.

| 구성 요소 | 상태 |
|---|---|
| BS_Lean 에셋 | 완성 |
| LeanAngle 변수 + 산출 | 완성 |
| BS_Lean Player + Apply Additive 노드 | 배치됨 |
| Apply Additive → Output Pose 연결 | 미연결 |
| 화면 반영 Lean | 미동작 |

### 10.4 S_DebugSetting 필드 확장

| 필드 | 기본값 | 게이트 대상 |
|---|---|---|
| `ShowGaitData` | True | CurrentGait 출력 |
| `ShowLocomotionData` | True | 속도 / 각도 / 방향 + 화살표 |
| `DistanceMatching` (신규) | True | 정지 예측 위치 시각화 (`Predict Ground Movement Stop Location` + `Draw Debug Capsule`) |

`ABP_Base.Debug` 그래프는 노드 20 → 37. 세 갈래 Sequence + 각 갈래 Branch. 세 번째 갈래가 Step 4 신규로, **디자이너가 게임 안에서 "지금 떼면 어디서 멈출까" 를 한 눈에 본다**.

---

## 11. 학습 포인트 정리

### 1. "진입 시 선택 / 업데이트 시 갱신" 분담

캐싱 타이밍 버그를 디버깅하면서 발견된 원칙이 구조 (OnInit + OnUpdate 쌍) 로 못박혔다. 6 콜백이 예외 없이 이 쌍.

### 2. 데이터 모델 재사용

`S_DirectionalAnims` 한 struct 를 8 변수가 재사용. 새 동작 (Stop / Start / Pivot) 은 코드 변경 없이 데이터 추가만으로 확장.

### 3. 이산 선택 + 관성 블렌딩

이산 Select + Inertialization / Inertial Blending 의 조합이 끊기지 않는 전환을 만든다. 모든 시퀀스 교체에서 동일.

### 4. State Machine 안의 State Machine

피벗처럼 "감속 → 회전 → 가속" 이 함께 있는 동작은 전용 SM (PivotSM) 으로 분리. 부모 SM 의 한 상태가 자체 SM 을 품는다.

### 5. 디버깅 일지를 노드 코멘트로 박제

`MaxTransitionsPerFrame` 1 유지, OnInit 캐싱 타이밍 등 "실패 후 수정" 의 교훈이 BP 안에 그대로 남아 있다. 같은 함정을 반복하지 않게 하는 학습 자료.

---

## 12. 다음 단계 후보

1. **Lean 합성 연결** - `Apply Additive` → Output Pose 한 선만 잇고 X / Y 핀에 `LeanAngle` / `Gait` 연결
2. **튜닝 상수의 외부화** - 방향 임계, `LeanInterpScale` (6), Stride Warping 파라미터, Play Rate Clamp 등을 struct / curve 로
3. **무기별 전이 레이어** - `ABP_Pistol` / `ABP_UnArmed` 의 빈 자식을 채워 Stop / Start / Pivot 의 무기별 오버라이드
4. **Distance Curve 회귀 체크** - Stop / Start / Pivot 전이 시퀀스 24 개의 Distance 커브 + Uniform Indexable 압축 의존성 유지
