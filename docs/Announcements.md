# 태그별 공개 안내 트래킹

수강생 대상 채널에 본 저장소를 GitHub 태그(릴리즈) 단위로 공개하면서 함께 안내한 **원문**을 그대로 보존하는 문서다. 표기/문장 보정 없이 안내한 그대로 기록해, 어느 시점에 어떤 범위까지 공개했고 어떤 맥락으로 소개했는지 추적하는 용도다.

각 태그에 대응하는 실제 구현 분석 문서(저자 코멘트·Monolith MCP 실측 포함)는 `docs/Step<N>/` 시리즈에 별도로 정리되어 있다. 안내 문구 → Step 문서 매핑은 각 섹션 헤더에 함께 표기한다.

> **표기 원칙**
> - 안내 본문은 모두 blockquote 로 인용해 "원문" 임을 시각적으로 구분한다.
> - 채널(Slack/Discord 등) 의 이모지 슬러그( 예: `:left_right_arrow:` ) 와 자동 줄바꿈, 글머리 번호 어긋남 등도 안내 시점의 모습을 그대로 보존한다.
> - 보정/요약 본은 별도로 작성하지 않는다. 정확한 기술 설명이 필요하면 대응 Step 문서를 따라간다.

---

## 0.1.0 - AnimationLayerInterface 기반 무기별 애니메이션 스위칭

**대응 단계**: [Step 1 - 프로젝트 구조 분석](./Step1/index.html)

**핵심 공개 범위**: ALI(Animation Layer Interface) 골격, `BP_LsCharacter` 의 1/2 번 키 무기 전환, `ABP_Base` + `ABP_Layers`/`ABP_Pistol`/`ABP_UnArmed` 의 Linked Anim Layer 구조.

> Lyra Skelton 프로젝트 0.1.0 안내
>
> Lyra 애니메이션 관련 스켈레톤 프로젝트 제작으로 라이라 애니메이션을 사용 해서 진행 하고 있는 팀 프로젝트들을 지원 하기 위한 세션을 준비 하고 있습니다.
>
> AnimationLayerInterface 를 사용한, 무기 혹은 상태에 따른 애니메이션을 교체시 하는 부분까지 미리 진행 가능 하도록 돕기 위해 미리 문서와 레포지토리를 공개 합니다.
>
> 1. 'Monolith' 라는 플러그인을 사용 하기 위해 5.7 버전으로 작성 하였습니다.
> 2. 작업한 블루프린트의 내용을 AI를 활용 해서 문서 생성 자동화를 하기 위해 사용 하였습니다.
> 3. Lyra 를 사용한 기능들을 스캘레톤 프로젝트에 구현 해서 보여드리기 까지는 작업 시간이 조금 오래 걸리기 때문에
> 4. 현재까지 작업 진행한 ALI 기능( 무기별 애니메이션 스위칭 ) 구현한 부분을 먼저 문서와 프로젝트를 공개 하고,
> 5. 추후 프로젝트 완성이 되면 그때 해설을 전반적으로 드릴 예정입니다.
>
> 프로젝트를 에디터 ( L_Start 레벨 ) 에서 실행 후, '1'번과 '2'번 키를 통해 애니메이션이 변경 되는 것을 확인 할 수 있습니다.

---

## 0.2.0 - Gait(Walk/Jog) + Aim 입력 + Locomotion 스테이트 머신

**대응 단계**: [Step 2 - Gait + Aim 시스템](./Step2/index.html)

**핵심 공개 범위**: `E_Gait`/`S_GaitSetting`/`GaitSettings`, `IA_Aim` (hold-to-Walk), `BPI_Animation.OnGaitChanged`, `LocomotionSM` (Idle/Cycle 2 상태).

> Lyra Skelton 프로젝트 0.2.0 안내
>
> 지난 1차 공개( AnimationLayerInterface 를 사용한 무기/상태별 애니메이션 교체 )에 이어, 이번에는 그 골격 위에 이동 속도 상태(Gait, 걷기/조깅) 와 조준 입력(Aim), 그리고 이동 속도에 따라 애니메이션을 전환하는 Locomotion 스테이트 머신 까지 구현한 부분을 추가 하였습니다.
>
> Lyra 애니메이션 관련 작업전 Step1 과 Step2 살펴 보시면 도움이 되시리라 생각 됩니다.
>
> 1. 1차의 ALI 골격 위에 실제로 채워 넣은 부분( 입력 -> Gait 상태 -> 이동 파라미터 적용 -> 인터페이스로 AnimBP 통지 -> 애니메이션 전환 )
> 2. 이동 속도 상태 enum( E_Gait : Walking / Jogging )과 상태별 이동 설정 구조체( S_GaitSetting )
> 3. 조준/이동 입력( IA_Aim )과, 캐릭터에서 AnimBP 로 상태 변경을 알리는 통신용 인터페이스( BPI_Animation )
> 4. CMC 에서 제공하는 Velocity 를 이용해 Idle :left_right_arrow: Cycle 포즈를 전환하는 스테이트 머신( LocomotionSM )
> 5. 캐릭터를 이동시키면서 마우스 오른쪽 버튼을 누르고 있는 동안(Aim) 걷기(Walking), 버튼을 떼면 조깅(Jogging) 으로 이동 속도와 애니메이션이 전환 되는 부분.

---

## 0.3.0 - 방향성 로코모션(4 방향 히스테리시스) + 뷰포트 Debug

**대응 단계**: [Step 3 - 방향성 로코모션 + Debug](./Step3/index.html)

**핵심 공개 범위**: `E_LocomotionDirections` (Forward/Backward/Right/Left), `S_DirectionalAnims`, `S_DebugSetting`, `CalculateLocomotionDirection` (임계 -130/130/-50/50, DeadZone 20, 히스테리시스), `OnCycleUpdate` 의 Gait -> Direction 2 단 Select.

> Lyra Skelton 프로젝트 0.3.0 안내
>
> 지난 2차 공개( Gait(걷기/조깅) + Aim 입력 + 이동 속도에 따라 전환되는 Locomotion 스테이트 머신 ) 에 이어, 이번에는 그 골격 위에 캐릭터의 이동 방향을 4방향(앞/뒤/좌/우) 으로 판정해 방향에 맞는 애니메이션으로 전환하는 방향성 로코모션과, 에디터 뷰포트 에서 속도 / 방향 값을 확인하는 Debug 시스템 까지 구현한 부분을 추가 하였습니다.
>
> Step1, Step2 의 구현 내용을 먼저 파악 후 살펴 보시는 걸 권장 합니다.
>
> 1. Step2 의 LocomotionSM(Idle/Cycle) 골격 위에 실제로 채워 넣은 부분( 이동 입력 -> 이동 각도 산출 -> 4방향 판정(히스테리시스) -> 방향별 시퀀스 선택 -> 애니메이션 전환 )
> 2. 이동 방향 enum( E_LocomotionDirections : Forward / Backward / Right / Left )과 방향별 애니메이션 시퀀스 묶음 구조체( S_DirectionalAnims )
> 3. 캐릭터 이동 각도를 4방향으로 분류하는 판정 함수( CalculateLocomotionDirection : 전방 ±50 / 후방 ±130 임계, DeadZone 20, 방향이 자주 튀지 않게 4. 잡아주는 히스테리시스 )
> 5. ABP_Base 의 스레드세이프 갱신 파이프라인에서 OnCycleUpdate 가 Gait -> Direction 2단 선택으로 S_DirectionalAnims 에서 시퀀스를 골라 Cycle 포즈에 적용하는 부분
> 6. 캐릭터를 여러 방향으로 이동 시 진행 방향에 맞는(앞/뒤/좌/우) 걷기, 조깅 애니메이션으로 전환 되고, 디버그 설정( S_DebugSetting ) 으로 속도/방향에 대한 뷰포트 내 디버그 정보 값을 켜고 끌 수 있는 부분.

---

## 0.4.0 - Start/Stop/Pivot 전이 상태 + Distance Matching + Warping

**대응 단계**: [Step 4 - Start/Stop/Pivot + Distance Matching](./Step4/index.html)

**핵심 공개 범위**: `LocomotionSM` 5 상태(+13 전이 룰) 확장, `ALI_Animation` 의 `StopLayer`/`StartLayer`/`PivotLayer` 추가, `AnimationLocomotionLibrary` 의 Distance Matching, Orientation/Stride Warping, `PivotSM` 중첩 상태 머신, `S_DebugSetting.DistanceMatching`.

> Lyra Skelton 프로젝트 0.4.0 안내
>
> 지난 3차 공개( 캐릭터의 이동 방향을 4방향(앞/뒤/좌/우) 으로 판정해 방향에 맞는 애니메이션으로 전환하는 방향성 로코모션과 뷰포트 Debug 시스템 ) 에 이어, 이번에는 그 골격 위에 이동의 시작 / 정지 / 방향전환(Start / Stop / Pivot) 전이 상태와, 발 미끄러짐을 잡는 Distance Matching, 그리고 적은 애니메이션 만으로 임의 방향과 보폭을 메우는 Orientation / Stride Warping 까지 구현한 부분을 추가 하였습니다.
>
> Step1, Step2, Step3 의 구현 내용에 어느정도 익숙해 지시는걸 추천해 드립니다. ( 이번 Step4 는 복잡한 각종 상태에 대한 전이와 애니메이션 블랜딩, 콜백 등 봐야 할 부분들이 많아요 )
>
> 1. Step3 의 4방향 Cycle 골격 위에 실제로 채워 넣은 이동 전이 동작(가속 / 감속과 방향 변화 감지 -> Stop / Start / Pivot 상태 진입 -> 전이 애니메이션 선택 -> Distance Matching 으로 발과 바닥 동기화 -> Cycle 로 복귀 )
> 2. Locomotion 스테이트 머신 확장( Idle / Cycle 2상태 -> Idle / Cycle / Stop / Start / Pivot 5상태, 13개 전이 룰 )과, 상태별 포즈를 갈아 끼우는 레이어 인터페이스 함수 추가( ALI_Animation 의 StopLayer / StartLayer / PivotLayer, ABP_Layers 에 Stop / Start / Pivot 의 진입 / 매 프레임 콜백 6종 )
> 3. 애니메이션의 발 위치와 캐릭터의 실제 이동 거리를 묶어 발 미끄러짐(foot sliding) 을 제거하는 Distance Matching( 정지 / 피벗 지점을 예측 -> 남은 거리에 대응하는 프레임으로 재생 시간을 정렬, AnimationLocomotionLibrary 플러그인과 시퀀스의 Distance 커브 활용 )
> 4. 적은 수의 기본 애니메이션(4방향) 만으로 임의 방향과 보폭을 메우는 Animation Warping( 하체를 실제 이동 방향으로 트는 Orientation Warping, 보폭을 이동 속도에 맞추는 Stride Warping )과, 피벗 도중 또 다른 피벗이 들어오는 상황을 전용 상태 머신( PivotSM ) 으로 처리하는 부분
> 5. 캐릭터가 멈춰 있다 출발(Start) 하거나, 달리다 정지(Stop) 하거나, 달리는 중 급선회(Pivot) 할 때 발이 미끄러지지 않고 자연스럽게 이어지는 부분과, 디버그 설정( S_DebugSetting ) 에 Distance Matching 항목이 추가되어 관련 디버그 정보를 켜고 끌 수 있는 부분.

---

## 0.4.5 - Start/Stop/Pivot + Distance Matching + Warping (심화 분석)

**대응 단계**: [Step 4.5 - Start/Stop/Pivot + Distance Matching + Warping (심화)](./Step4.5/index.html)

**핵심 공개 범위**: 새 자산/기능 공개가 아니라, Step 4 와 같은 자산 주제를 더 상세하게 다시 본 심화 분석 문서 추가. `LocomotionSM` 의 **13 전이 룰 노드 트리** (TransitionResult 부터 PropertyAccess 까지), `ABP_Base` **BTSUA 6 단 함수 시그니처**, `BS_Lean` 의 **axis + 5 샘플 좌표 풀 메타**, `BP_LsCharacter.GaitSettings` 의 **두 엔트리 6 CMC 파라미터 default** (UnArmed 250/250/250 vs Pistol 800/500/1200), 그리고 `ALI_Animation` 의 default impl 이 빈 Output Pose 1 노드라는 **분석 도구의 enumerate 한계** 식별. 함께 `docs/Research_UE_Asset_Analyze.md` 섹션 11 에 Step 간 분석 문서 작성 원칙을 신설.

> Lyra Skelton 프로젝트 0.4.5 안내
>
> 지난 4차 공개( Start / Stop / Pivot 전이 상태 + Distance Matching + Warping ) 에 이어, 이번에는 새 기능을 추가한 것이 아니라 같은 자산 주제를 분석 도구가 더 상세해진 덕에 한 단계 더 깊이 다시 본 심화 분석 문서( Step 4.5 ) 를 공개 합니다.
>
> Step 4 의 구현 내용을 먼저 살펴 보신 분들께 권장 드리는, 같은 자산을 더 깊이 들여다 보는 보강 자료 입니다. 8 섹션 골격을 Step 4 와 동일하게 정렬해 같은 번호끼리 짝지어 읽을 수 있도록 했습니다.
>
> 1. LocomotionSM 13 전이의 룰 그래프 노드 트리( TransitionResult 부터 PropertyAccess 까지 노드 단위로 펼침 ) - "어떤 변수와 연산이 어떤 전이 조건에 들어가는지" 를 본문에서 검증
> 2. ABP_Base 의 24 변수 카테고리 별 분류 + BTSUA( BlueprintThreadSafeUpdateAnimation ) 6 단 함수 시그니처 + OnInitPivotState 그래프 ( 진입 순간의 입력 방향을 박제하는 패턴 )
> 3. ABP_Layers 의 OnInit / OnUpdate 6 콜백 노드 수와 역할 + Distance Matching 이 동작하기 위한 두 가지 전제 조건 실측 ( 시퀀스의 Distance 커브 + Uniform Indexable 압축 ), 24 개 전이 시퀀스 모두 충족 확인
> 4. BS_Lean 의 axis( LeanAngle [-90,90] / Gait [0,1] ) + 5 샘플 좌표 풀 메타, LeanAngle 산출 파이프라인( DeltaYaw -> LeanInterpScale=6 으로 감쇠 -> Select[ LocomotionDirection ] -> Clamp -90/90 ), 그리고 Apply Additive 출력이 Output Pose 에 미연결이라 Lean 이 화면에 안 나오는 미완 상태
> 5. BP_LsCharacter.GaitSettings( map<byte, S_GaitSetting> ) 의 두 엔트리 6 CMC 파라미터 default 값 ( UnArmed 250 / 250 / 250 vs Pistol 800 / 500 / 1200 ) - 같은 Stop 전이라도 무기 상태에 따라 정지 거동이 어떻게 달라지는지의 근거
> 6. 분석 도구 자체의 한계 식별( ALI_Animation 의 5 default impl 이 빈 Output Pose 1 노드이며, ABP_Layers 의 인터페이스 구현 그래프 - PivotSM / Orientation Warping / Stride Warping 노드가 사는 곳 - 가 본 시점에도 도구 단독으로는 풀 노드 트리 재현 불가 ) 와 함께, 향후 Step 간 분석 문서 작성 시 일관성을 지키기 위한 원칙( docs/Research_UE_Asset_Analyze.md 섹션 11 ) 신설.
