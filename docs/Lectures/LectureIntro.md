# Lecture Intro - 라이라 애니메이션 시스템 한눈에

본 강의는 UE 5.7 기반 LyraSkeleton 프로젝트의 캐릭터 애니메이션 구조를 5 개 Step (1, 2, 3, 4, 4.5) 에 걸쳐 누적적으로 쌓아 올린다. 각 Step 으로 들어가기 전에 본 문서를 한 번 읽어 두면, 개별 노드 / 표 / 코드 블록이 전체 파이프라인의 어디에 놓이는지를 잡을 수 있다.

## 1. 본 강의가 함께 만드는 것

다섯 Step 이 다 끝나면 다음 동작이 한 캐릭터 안에 모두 모인다.

- 무기 상태 (비무장 / 권총) 에 따라 상위 바디 포즈가 통째로 바뀐다.
- 마우스 우클릭으로 조준하면 걷기 모드 (감속), 떼면 조깅 모드 (가속) 로 부드럽게 전환된다.
- WASD 로 어느 방향이든 이동 가능. 4 방향 (전 / 후 / 좌 / 우) 시퀀스가 히스테리시스로 안정 적용된다.
- 멈춰 있다 출발하면 Start 시퀀스, 달리다 멈추면 Stop 시퀀스, 급선회하면 Pivot 시퀀스가 각각 정확한 거리 / 시점에 맞춰 재생된다.
- 발이 미끄러지지 않고 캐릭터의 실제 이동 거리에 시퀀스 재생이 묶인다.
- 화면 디버그 (속도 / 각도 / 방향 / 정지 예측 위치) 를 토글로 켜고 끌 수 있다.

각 단계를 구현하는 자산 (`ABP_Base`, `ABP_Layers`, `ABP_Pistol`, `ABP_UnArmed`, `ALI_Animation`, `BPI_Animation`, `BP_LsCharacter`, `LocomotionSM`, `BS_Lean` 등) 은 Step 진행에 따라 단계별로 채워진다.

## 2. 라이라 애니메이션 시스템의 가치

왜 이 구조를 배우는가. Step 진행 중에 마주칠 각 패턴의 이점을 정리한다.

### 2.1 분기 폭발 회피 - Linked Anim Layer

`Switch` / `Branch` 노드로 무기마다 분기하는 단순한 구조는 무기 종류가 3 종 이상이 되면 그래프가 비대해지고 머지 충돌이 잦아진다. Linked Anim Layer 는 `ABP_Base` 의 한 슬롯에 자식 ABP 한 장을 끼우는 방식으로, **베이스 그래프 변경 없이 자식만 교체** 한다. 새 무기는 자식 ABP 한 개 + Switch 분기 한 줄로 끝난다.

### 2.2 코드가 아니라 데이터로 확장 - Map / Struct 주도 설계

이동 속도 모드 (Gait) 의 6 가지 CMC 파라미터를 `S_GaitSetting` struct + `Map<Gait, S_GaitSetting>` 로 관리한다. 새 Gait (예: Sprint) 추가는 enum 엔트리 + 맵 엔트리만 늘리면 끝. `SetGaitAndApplySettings` 함수 본체는 한 줄도 바꾸지 않는다. 같은 패턴이 `S_DirectionalAnims` (4 방향 시퀀스 묶음), `S_DebugSetting` (디버그 게이트), `GaitSettings` 까지 반복된다.

### 2.3 스레드 안전한 캐싱 - PropertyAccess + BTSUA

UE5 의 애니메이션은 워커 스레드 (WorkerThread) 에서 평가된다. CMC / Pawn 의 멤버를 직접 읽으면 데이터 레이스 위험. PropertyAccess 는 외부 객체의 프로퍼티를 멀티 스레드 안전하게 캐싱한다. `BlueprintThreadSafeUpdateAnimation` (BTSUA) 안에서 6 단 함수 체인이 매 프레임 24 개 변수를 한 번에 갱신해, 그 뒤 상태 머신 / 레이어 / 전이 룰이 모두 같은 신선한 캐싱값을 본다.

### 2.4 끊김 없는 전환 - 이산 선택 + Inertialization

방향 / Gait / 무기 같은 이산 상태가 바뀔 때마다 `Select` 노드가 시퀀스를 갑자기 갈아 끼우지만, 그래프 상위의 `Inertialization` 노드가 본의 속도 / 가속도를 유지하면서 부드럽게 보간한다. 이산 결정의 단순함과 연속 보간의 자연스러움을 같이 얻는다.

### 2.5 적은 시퀀스로 임의 방향 / 보폭 - Distance Matching + Warping

4 방향 시퀀스만으로 360 도 임의 각도를 표현할 수 있다 (Orientation Warping). 시퀀스의 보폭과 실제 이동 속도의 차이도 IK 발 간격으로 메운다 (Stride Warping). 정지 / 출발 시 캐릭터의 실제 이동 거리에 시퀀스 시간을 묶어 발 미끄러짐을 제거한다 (Distance Matching). 모캡 예산이 빠듯한 인디 팀에서도 같은 자산으로 더 많은 표현 폭을 낸다.

### 2.6 복잡한 행동의 분리 - 중첩 State Machine (PivotSM)

피벗 (급선회) 은 감속 / 회전 / 가속이 한 시퀀스 안에 모여 있고, 시퀀스 도중 또 다른 피벗이 들어올 수 있다. 단순 시퀀스 교체로는 모션이 끊긴다. 라이라는 `PivotLayer` 안에 전용 중첩 State Machine (`PivotSM`) 을 두고 A / B 상태가 핑퐁으로 다음 피벗을 받는 구조로 끊김을 막는다. 부모 SM 의 한 상태가 자체 SM 을 품는 패턴이다.

### 2.7 시퀀스 - State 결합: AnimNotify 기반 전이

`AN_TransitionToLocomotion` 같은 빈 마커 AnimNotify 를 시퀀스 타임라인에 배치하고, 전이 룰의 `Was Anim Notify Triggered in Source State` AnimGetter 가 그 마커를 보고 전이를 트리거한다. 시퀀스 길이가 바뀌어도 전이 시점이 시퀀스를 따라 자동으로 움직인다.

## 3. 트레이드오프

이 구조가 치르는 비용. 본인 프로젝트가 라이라 패턴 도입에 적합한지 판단할 때 참고.

### 3.1 가파른 학습 곡선

알아야 할 엔진 개념이 많다. ALI / BPI / Linked Anim Layer / PropertyAccess / BTSUA / Inertialization / Sequence Evaluator vs Sequence Player / Distance Matching / Orientation Warping / Stride Warping / 중첩 State Machine / AnimNotify 전이 트리거 등. 본 강의가 5 Step 으로 나눠 누적적으로 쌓는 이유.

### 3.2 디버깅 난이도

다음 같은 함정이 실제로 본 프로젝트에서 발견되었다.

- **워커 스레드 / 캐싱 타이밍**: `OnInit*` 콜백이 `BlueprintThreadSafeUpdateAnimation` 보다 먼저 호출되어 ABP_Base 의 캐싱값이 아직 0 인 사실 (Step 4 의 OnInit / OnUpdate 쌍 분리의 동기).
- **`MaxTransitionsPerFrame` 미묘한 함정**: 엔진 기본값 3 으로 두면 한 프레임에 전이 룰이 3 회 평가되는데, "직전 프레임" 변수가 그 사이에 갱신되어 비교가 깨짐. 1 로 낮춰 해결 (Step 4 디버깅 일지).
- **자산 분리의 양면성**: 한 동작을 따라가려면 `BP_LsCharacter`, `ABP_Base`, `ABP_Layers`, `ABP_Pistol / UnArmed`, `ALI_Animation`, `BPI_Animation`, 시퀀스, `LocomotionSM`, `PivotSM` 여러 자산을 오가야 함.

### 3.3 자산 / 환경 전제 조건

- **Distance Matching 시퀀스**: 24 개 전이 시퀀스 모두 `Distance` 커브 (Animation Data Modifiers > Distance Curve Modifier 로 생성) + `UniformIndexableCurveCompressionSettings` 압축 필수.
- **`AnimationLocomotionLibrary` 플러그인 활성화**: `LyraSkeleton.uproject` 에 명시. 플러그인 정책이 제한되는 콘솔 / 특수 패키지 환경에서는 별도 검토 필요.
- **시퀀스 자산 분량**: Walk / Jog 각각의 4 방향 Cycle + 4 방향 Stop + 4 방향 Start + 4 방향 Pivot = **최소 32 개 + Idle 1 개**. 모캡 예산이 없는 인디는 부담될 수 있음.
- **IK 셋업**: Spine Bones / IK Foot Bones 가 정의된 스켈레톤이 있어야 Warping 노드가 동작.

### 3.4 작은 프로젝트에는 과도할 수 있음

무기 1 ~ 2 종, 단일 방향 idle 만 필요한 게임에는 라이라 풀 구조 도입이 오버 엔지니어링이다. 본 강의의 각 Step 상단에 **"이 Step 이 적합한 프로젝트"** 섹션을 두어 본인 프로젝트 사양과 매칭해 볼 수 있게 했다. Step 1 부터 4.5 까지 모두 도입해야 하는 게 아니라, 필요한 Step 까지만 채택하는 것도 정당한 선택이다.

### 3.5 본 시점에서는 전부 Blueprint

본 강의의 자산은 모두 Blueprint / AnimBlueprint 다. C++ 이식 시 다음 이득이 추가로 가능하다.

- 패키지 빌드 안정성 (런타임 클래스 결합)
- 인스턴스 다수 (PvP 의 다수 캐릭터, AI 군집) 등장 시 BP 평가 비용 누적 회피
- 네이티브 디버거 / 프로파일러 활용성

C++ 이식은 본 강의의 학습 단계 다음 후보다 (Step 1 ~ 4.5 의 BP 가 검증된 후).

### 3.6 모든 패턴이 모든 프로젝트에 정답은 아니다

- **이산 선택 + Inertialization** 조합 대신 **연속 BlendSpace** 가 자연스러운 경우도 있다 (예: 미끄러지듯 회전하는 호버 캐릭터).
- **데이터 주도 Gait Map** 대신 **하드코딩** 이 적합한 게임도 있다 (Gait 가 영원히 2 종일 게 확실한 단일 장르 게임).
- **Linked Anim Layer** 대신 **단일 ABP + Switch** 가 더 단순한 게임도 있다 (무기 1 ~ 2 종).

본 강의는 "라이라가 어떻게 했는가" 를 본문화한다. 그 패턴을 자기 프로젝트의 사양에 맞게 골라 쓰는 판단은 학습 후 단계.

## 4. 데이터 흐름과 호출 순서

5 Step 이 다 끝났을 때의 한 프레임 (worker thread + game thread) 의 데이터 파이프라인.

### 4.1 입력 단 (game thread, BP_LsCharacter)

```text
유저 입력 (WASD, 마우스, 우클릭, 휠 스크롤)
   ↓ Enhanced Input
EnhancedInputAction IA_Move / IA_Look / IA_Aim / IA_SwitchWeapon
   ↓
BP_LsCharacter.EventGraph
   IA_Move / IA_Look  → CMC 에 이동 / 시점 입력 (Add Movement Input, Add Controller Yaw)
   IA_Aim Triggered   → SetGaitAndApplySettings(Walking)   # 우클릭 hold
   IA_Aim Completed   → SetGaitAndApplySettings(Jogging)   # 우클릭 release
   IA_SwitchWeapon    → Set EquippedWeapon + Mesh.LinkAnimClassLayers(ABP_*)

SetGaitAndApplySettings(Gait)
   ├ Branch CurrentGait != Gait (가드)
   ├ Set CurrentGait
   ├ Message OnGaitChanged(Gait)   # BPI_Animation 메시지 송신
   └ GaitSettings.Find(Gait) → CMC 6 파라미터 적용 (MaxWalkSpeed, MaxAccel, BrakingDecel, ...)
```

### 4.2 데이터 캐싱 단 (worker thread, ABP_Base.BTSUA)

```text
ABP_Base.BlueprintThreadSafeUpdateAnimation(DeltaTime)    # 6 단 함수 체인
   ├ SetLocationData(DeltaTime)        # WorldLocation, LastWorldLocation, DeltaLocation
   ├ SetVelocityData                    # CharacterVelocity, CharacterVelocity2D
   ├ SetAccelerationData                # Acceleration, Acceleration2D, bIsAccelerating
   ├ SetRotationData(DeltaTime, LeanInterpScale=6)
   │     # WorldRotation, CurrentYaw, LastFrameYaw, DeltaYaw, LeanAngle
   ├ UpdateOrientationData              # LocomotionAngle, LocomotionDirection
   │     # AccelerationLocomotionAngle, AccelerationLocomotionDirection
   └ SetCharacterStates                 # bIsGaitChanged, LastLocomotionDirection, LastGait

   ↑ 모든 외부 객체 (CMC, Actor) 의 멤버는 PropertyAccess 노드로 읽음 (스레드 안전).
```

### 4.3 상태 결정 단 (LocomotionSM, ABP_Base.AnimGraph)

```text
LocomotionSM (5 상태 + 13 전이)
   상태:
     Idle / Cycle / Stop / Start / Pivot
   전이 룰 입력 (ABP_Base 캐싱 변수):
     bIsAccelerating, CharacterVelocity2D, Acceleration2D,
     LocomotionDirection, LastLocomotionDirection,
     bIsGaitChanged, PivotAcceleration2D
   PivotAlias → Pivot: dot(norm Velocity2D, norm Acceleration2D) < 임계
   Pivot → Cycle (한 분기): AN_TransitionToLocomotion AnimNotify 트리거

각 상태는 ALI_Animation 의 대응 레이어 함수를 호출:
   Idle  → IdleLayer()
   Cycle → CycleLayer()
   Stop  → StopLayer()
   Start → StartLayer()
   Pivot → PivotLayer()
```

### 4.4 자식 ABP 레이어 평가 단 (ABP_Layers, 부모; ABP_Pistol / ABP_UnArmed, 자식)

```text
ABP_Layers (parent of ABP_Pistol / ABP_UnArmed) implements ALI_Animation
   각 레이어에 OnInit / OnUpdate 콜백 쌍 (Step 4 부터):
     OnInit*  (진입 시 1 회):  CMC 직접 읽기 (캐싱 미신선)
                              → 무엇을 재생할지 결정 (방향 / Gait 시퀀스 선택)
     OnUpdate* (매 프레임):     ABP_Base 캐싱값 (신선) 사용
                              → 어디를 재생할지 결정 (Distance Matching 시간 정렬)

   레이어 그래프 안의 합성:
     CycleLayer  : Sequence Player → Orientation Warping → Stride Warping → ...
     StopLayer   : Sequence Evaluator + Distance Match to Target → Orientation Warping
     StartLayer  : Sequence Evaluator + Advance Time by Distance Matching → Orientation Warping → Stride Warping
     PivotLayer  : PivotSM (A/B 핑퐁) → Inertialization
                   각 상태 내부: Sequence Evaluator → Orientation Warping
```

### 4.5 시퀀스 재생 단

```text
Cycle / Idle : Sequence Player        (시간 자동 흐름)
Stop / Start : Sequence Evaluator     (외부가 Explicit Time 으로 시간 결정)
                + Distance Matching
                  Stop  : Predict Ground Movement Stop Location  → Distance Match to Target
                  Start : Advance Time by Distance Matching      (Play Rate Clamp)
Pivot        : Sequence Evaluator
                + Predict Ground Movement Pivot Location
                + Distance Match to Target
                + PivotSM 의 A/B 핑퐁
```

### 4.6 포즈 후처리 단 (ABP_Base.AnimGraph)

```text
LocomotionSM 출력 포즈
   ↓
Inertialization              # 이산 결정 사이 부드러운 보간
   ↓
Output Pose
```

### 4.7 한 장 요약

```text
[Game Thread]                            [Worker Thread]
유저 입력                                 매 프레임 BTSUA
   ↓                                         ↓
BP_LsCharacter                            ABP_Base 24 변수 캐싱
   ├ CMC 파라미터 변경  -------------->        ↓
   ├ BPI 메시지        -------------->   LocomotionSM (5 상태)
   └ LinkAnimClassLayers ------------>        ↓
                                         ALI 레이어 함수 호출
                                              ↓
                                         ABP_Layers (OnInit / OnUpdate)
                                              ↓
                                         Sequence Player / Evaluator + Distance Matching
                                              ↓
                                         Orientation / Stride Warping + PivotSM
                                              ↓
                                         Inertialization
                                              ↓
                                         Output Pose
```

## 5. Step 별 학습 동선

| Step | 주제 | 핵심 신규 자산 / 패턴 |
|---|---|---|
| Step 1 | Linked Anim Layer 와 무기별 애니메이션 전환 | `ABP_Base`, `ABP_Layers`, `ABP_Pistol`, `ABP_UnArmed`, `ALI_Animation`, `E_Weapon`, Enhanced Input, Inertialization, PropertyAccess |
| Step 2 | Gait, Aim 입력, LocomotionSM (2 상태) | `E_Gait`, `S_GaitSetting`, `BPI_Animation`, `LocomotionSM` (Idle / Cycle), `Set Sequence with Inertial Blending` |
| Step 3 | 4 방향 로코모션과 Debug | `E_LocomotionDirections`, `S_DirectionalAnims`, `S_DebugSetting`, 4 방향 히스테리시스, 2 단 중첩 Select, 데이터 주도 디버그 |
| Step 4 | Start / Stop / Pivot, Distance Matching, Warping | `LocomotionSM` (5 상태 + 13 전이), Distance Matching 4 함수, Orientation / Stride Warping, `PivotSM`, `AN_TransitionToLocomotion`, `BS_Lean` (미연결 미완) |
| Step 4.5 | Step 4 자산 심화 분석 | 13 전이 룰 노드 트리, ABP_Base 24 변수 + BTSUA 6 단 시그니처, ALI default impl 한계, GaitSettings 6 CMC 파라미터 default, Step 간 분석 문서 작성 원칙 |

각 Step 본문 상단에 **"이 Step 이 적합한 프로젝트"** 섹션이 있다. 본인의 프로젝트 사양과 매칭해 보고 진입하면 좋다. Step 1 ~ 4 를 본 뒤 Step 4.5 를 보는 것이 권장 순서이며, Step 4.5 는 기능 도입이 아니라 같은 자산을 더 깊이 보는 분석 자료다.

## 6. 본 강의를 보는 방식 권장

- 한 Step 마다 자산을 에디터에서 직접 열어 확인. 본문에 등장하는 노드 / 변수 / 그래프를 한 번 눈으로 보면 본문 설명과 빠르게 연결된다.
- 본문의 코드 블록 다이어그램은 실제 자산의 노드 / 핀 연결을 텍스트로 옮긴 것. 에디터의 같은 위치를 찾아 비교하면 좋다.
- "꼭 알아야 할 기능" 섹션 (PropertyAccess, Inertialization, Distance Matching 등) 은 해당 Step 외에서도 반복 등장하므로, 첫 등장 Step 에서 충분히 익히는 것이 다음 Step 의 부담을 크게 줄인다.
- Step 4 의 "디버깅 일지" (`MaxTransitionsPerFrame`, OnInit 캐싱 타이밍) 는 실제 본 프로젝트에서 발견된 실패 후 수정의 기록이다. 같은 함정을 반복하지 않게 하는 학습 자료이므로 가볍게 읽지 말 것.
