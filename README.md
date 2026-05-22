# LyraSkeleton

Unreal Engine 5.7 기반의 **Lyra/ALS 스타일 캐릭터 골격 학습 프로젝트**. 거의 모든 게임플레이가 블루프린트로 작성되어 있고, 학습 단계마다 BP 로직을 C++ 로 점진적으로 이식해 가는 것이 본 프로젝트의 진행 방향이다.

## 환경

- **Unreal Engine 5.7** (`LyraSkeleton.uproject` 의 `EngineAssociation`)
- Windows + DX12/SM6
- 활성 렌더링 기능: Lumen, Substrate, Virtual Shadow Maps, Ray Tracing (`Config/DefaultEngine.ini`)
- C++ 모듈: `LyraSkeleton` (Enhanced Input 의존)
- IDE: Rider 또는 Visual Studio

## 시작하기

### 1. 저장소 클론

본 저장소는 Claude 가 BP 를 분석할 때 사용하는 [Monolith MCP 플러그인](https://github.com/tumourlove/monolith) 을 `Plugins/Monolith/` 에 **Git 서브모듈** 로 v0.14.10 에 핀해서 포함하고 있다. 클론 시 서브모듈까지 한 번에 가져오는 것을 권장한다.

```bash
git clone --recurse-submodules <REPO_URL> LyraSkeleton
cd LyraSkeleton

# 이미 서브모듈 없이 클론한 경우 (한 번만):
# git submodule update --init --recursive
```

### 2. Lyra 마이그레이션 에셋 다운로드 (필수)

본 저장소는 `Content/ALS/` 만 Git 으로 추적한다. `Content/` 의 나머지 폴더들(`Characters/`, `Maps/`, `Effects/`, `PhysicsMaterials/`, `Collections/`, `Developers/` 등) 은 Epic 의 Lyra Starter Game 에서 마이그레이션한 캐릭터·메시·머티리얼 등 **대용량 에셋** 이라 `.gitignore` 로 제외되어 있다.

아래 링크에서 압축 파일을 받아 저장소의 `Content/` 폴더에 풀어 넣어야 에디터가 정상적으로 동작한다.

**다운로드**: https://drive.google.com/file/d/1npqc_OSPPaPpjrEpUgDMyOPFcn0X4slu/view?usp=drive_link

압축 해제 후 디렉토리 구조 (`Content/ALS/` 와 나머지 폴더가 같은 레벨에 위치):

```
Content/
├── ALS/                 (Git 추적, 학습 작성물)
├── Characters/          (다운로드 후 복원)
├── Collections/
├── Developers/
├── Effects/
├── Maps/
└── PhysicsMaterials/
```

### 3. 빌드 / 실행

표준 UE 5.7 워크플로. 자세한 명령은 [CLAUDE.md](./CLAUDE.md) 의 "빌드 / 실행" 섹션 참고.

## 문서

학습 단계별 문서는 **GitHub Pages** 로도 게시된다. 브라우저에서 바로 열람 가능:

- **Step 1 - 프로젝트 구조 분석**: <https://bong9tutor.github.io/LyraSkeleton/Step1/> ([소스](./docs/Step1/index.html))

  UE 5.7 기반 LyraSkeleton 프로젝트의 자산·설정·코드를 5 개 섹션으로 분석한 문서. Monolith MCP 실측을 1 차 자료로 삼는다.

  1. **프로젝트 개요** - 엔진 버전, 모듈 구성, 빌드 타겟, BP 중심의 현재 구현 상태, 자산 위치 정리
  2. **C++ 모듈 구조** - `Source/` 5 개 파일, `Build.cs`/`Target.cs` 의 모듈 의존성, IWYU·PCH 정책
  3. **Content/ALS 자산 맵** - 자산 13 개의 위치·의존성, `GameMode → Pawn → Mesh → AnimBP` 연결 체인
  4. **애니메이션 레이어 시스템** - `ABP_Base` 의 `LinkedAnimLayer(IdleLayer)` + `Inertialization` + `ABP_Layers` 부모-자식 체인, `ALI_Animation` 인터페이스
  5. **다음 단계 로드맵** - 현재 비어있는 슬롯 명세 + BP → C++ 이식 우선순위 7 단계

- **Step 2 - Gait + Aim 시스템**: <https://bong9tutor.github.io/LyraSkeleton/Step2/> ([소스](./docs/Step2/index.html))

  Step 1 골격 위에 이동 속도 상태(Gait)와 조준 입력(Aim), Locomotion 스테이트 머신을 구현한 작업을 5 개 섹션으로 분석. 신규 4 + 변경 7 자산을 Monolith MCP 실측으로 비교한다.

  1. **Step 2 개요** - 추가된 것 요약, Step 1 대비 한눈 비교, 신규 4 + 변경 7 자산 맵, 데이터 흐름 한 장
  2. **Gait 데이터 모델** - `E_Gait` enum + `S_GaitSetting` struct + `GaitSettings` 맵 / `SetGaitAndApplySettings` 함수 (실측 36 노드)
  3. **입력과 통신 흐름** - `IA_Aim` (Boolean) hold-to-jog 흐름과 `BPI_Animation.OnGaitChanged` Character → AnimBP 채널
  4. **Locomotion 스테이트 머신** - `ABP_Base` AnimGraph 가 `LocomotionSM` (Idle/Cycle) 으로 교체, `ALI_Animation` 의 `CycleLayer`, `ABP_Layers` 시퀀스 갱신
  5. **Step 1 대비 변경점** - 자산별 종합 비교표, Monolith 실측 메타·quirk 갱신, 남은 빈 영역과 다음 단계

- **Step 3 - 방향성 로코모션 + Debug**: <https://bong9tutor.github.io/LyraSkeleton/Step3/> ([소스](./docs/Step3/index.html))

  Step 2 의 Gait + Aim + LocomotionSM(Idle/Cycle) 위에, 이동 각도를 4 방향(Forward/Backward/Right/Left)으로 판정하는 히스테리시스 분류기와 방향별 시퀀스 묶음(`S_DirectionalAnims`), 화면 디버그(`S_DebugSetting`)를 추가한 작업을 6 개 섹션으로 분석. 신규 3 + 변경 5 자산을 Monolith MCP 실측 + 저자 코멘트로 비교한다.

  1. **Step 3 개요 · 주요 기능** - 주요 구현 기능 4 가지 우선 정리, Step 2 골격 대비 한눈 요약, 신규 3 + 변경 5 자산 맵, 데이터 흐름 한 장
  2. **방향 데이터 모델** - `E_LocomotionDirections` (4 엔트리) + `S_DirectionalAnims` (4 시퀀스 필드) + `S_DebugSetting` (2 bool), 세 신규 자산의 실측 정의와 cross-check
  3. **방향 판정 파이프라인** - `ABP_Base` 의 5 단 스레드세이프 파이프라인, `Calculate Direction` 으로 각도 산출 → `CalculateLocomotionDirection` (임계 -130/130/-50/50, DeadZone 20, 히스테리시스)
  4. **방향성 사이클 + Debug** - `OnCycleUpdate` 의 2 단 중첩 Select(Gait → Direction)가 `S_DirectionalAnims` 에서 시퀀스 선택, `S_DebugSetting` 으로 게이트되는 화면 디버그
  5. **저자 코멘트 심층 분석** - 저자가 BP 에 직접 단 함수 설명 + 노드 코멘트 전수(실측 18)를 기능별로 대조, 추정 아닌 응답 그대로 인용
  6. **Step 2 대비 변경점** - 자산별 Step 2 → Step 3 종합 비교표, Step 2 로드맵 항목 해소 여부, Monolith 실측 메타·quirk 갱신, 다음 단계

- **Step 4 - Start/Stop/Pivot + Distance Matching**: <https://bong9tutor.github.io/LyraSkeleton/Step4/> ([소스](./docs/Step4/index.html))

  Step 3 의 4 방향 Cycle 위에, 이동의 시작(Start)/정지(Stop)/방향전환(Pivot)을 `LocomotionSM` 의 정식 상태로 추가하고, Distance Matching 으로 발 미끄러짐을 제거하고, 레이어 그래프마다 Orientation/Stride Warping 을 적용한 작업을 8 개 섹션으로 분석. 회전 기울임용 `BS_Lean` 은 합성 노드까지 배치됐으나 Output 연결이 빠진 미완 상태다. 신규 2 + 핵심 변경 5 자산, `AnimationLocomotionLibrary` 설정, 전이 시퀀스 Distance Curve/Notify 를 Monolith MCP 실측 + 저자 디버깅 코멘트로 비교한다.

  1. **Step 4 개요 · 주요 기능** - 주요 구현 기능 5 가지 우선 정리, Step 3 골격 대비 한눈 요약, 신규 2 + 핵심 변경 5 자산 맵, 데이터 흐름 한 장
  2. **LocomotionSM 상태 확장** - `LocomotionSM` 이 Idle/Cycle 2 상태에서 Idle/Cycle/Stop/Start/Pivot 5 상태로, 13 개 전이 룰, `ALI_Animation` 레이어 2 → 5, MaxTransitionsPerFrame 디버깅 기록
  3. **ABP_Base 데이터 파이프라인** - 변수 8 → 24, `BlueprintThreadSafeUpdateAnimation` 5 단 → 6 단, 가속도/회전(Yaw)/Gait 전이 데이터 수집과 속도·가속도 2 갈래 방향 계산
  4. **Start/Stop/Pivot + 거리매칭** - `ABP_Layers` 의 OnInit/OnUpdate 6 콜백, Sequence Evaluator + `Predict Ground Movement` + `Distance Match to Target` 로 발 미끄러짐 제거
  5. **레이어 그래프 + Warping** - Idle/Cycle/Stop/Start/Pivot 5 개 레이어 구현 그래프, Orientation Warping(4 레이어) + Stride Warping(Cycle/Start), PivotLayer 의 `PivotSM` 중첩 상태 머신
  6. **Lean 데이터 준비 + Debug** - `BS_Lean` 에셋·`LeanAngle` 산출·CycleLayer 의 합성 노드까지 배치됐으나 Output 미연결, `S_DebugSetting` 에 `DistanceMatching` 디버그 필드 추가
  7. **저자 코멘트 + 디버깅 기록** - 저자가 BP 에 직접 단 함수 설명 + 노드 코멘트 전수, MaxTransitionsPerFrame 버그·캐싱 타이밍 fix 디버깅 일지 + Warping/PivotSM 설계 코멘트 분석
  8. **Step 3 대비 변경점** - 자산별 Step 3 → Step 4 종합 비교표, Step 3 로드맵 항목 해소 여부, Distance Curve/Notify 실측 보강, 다음 단계

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Claude Code 작업 가이드. 프로젝트 목적·공통 규약·빌드/실행·핵심 아키텍처. |
| [docs/CodingStandard.md](./docs/CodingStandard.md) | UE C++ 코딩 표준. 네이밍, IWYU, UPROPERTY, 어서션·로깅·네트워크·애니메이션 등 작성 규약. |
| [docs/Research_UE_Asset_Analyze.md](./docs/Research_UE_Asset_Analyze.md) | Monolith MCP 단독으로 BP 자산을 분석·문서화할 때의 가능 범위와 퀄리티 평가. |
| [docs/Step1/](./docs/Step1/index.html) | Step 1 강의 자료. UE 5.7 기반 LyraSkeleton 프로젝트의 캐릭터·애니메이션 구조 분석. |
| [docs/Step2/](./docs/Step2/index.html) | Step 2 강의 자료. Gait(이동 속도 상태) + Aim 입력 + Locomotion 스테이트 머신 구현 분석, Step 1 대비 비교. |
| [docs/Step3/](./docs/Step3/index.html) | Step 3 강의 자료. 4 방향 방향성 로코모션(히스테리시스 분류기) + `S_DirectionalAnims`/`S_DebugSetting` 추가, 저자 코멘트 심층 분석, Step 2 대비 비교. |
| [docs/Step4/](./docs/Step4/index.html) | Step 4 강의 자료. Start/Stop/Pivot 전이 상태 + Distance Matching + 레이어별 Orientation/Stride Warping, 저자 디버깅 기록 분석, Step 3 대비 비교. |
