# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작성 규약 (모든 산출물 공통)

- 기본 응답 언어는 **한국어**.
- **em dash (`—`, U+2014) 사용 금지**. 답변·코드 주석·문서 어디에서도 사용하지 않고 ASCII 하이픈(`-`)으로 대체한다. en dash(`–`), ellipsis(`…`), 중간점(`·`), 스마트 따옴표(`""''`) 등 다른 타이포그래피 문자는 본 규칙의 적용 대상이 아니므로 자유롭게 사용 가능하다.

## 프로젝트 목적

- **Unreal Engine 5.7** 게임 프로젝트. `LyraSkeleton.uproject`의 `EngineAssociation`이 `"5.7"`이며 `Source/*.Target.cs`도 `EngineIncludeOrderVersion.Unreal5_7` / `BuildSettingsVersion.V6` 로 고정되어 있다.
- 이름과 폴더 구성(`Content/ALS/`)에서 보듯이 **Lyra/ALS 스타일 캐릭터 골격(skeleton) 학습 프로젝트**다. 현재 거의 모든 게임플레이는 블루프린트로 구성되어 있고, C++ 모듈은 거의 비어 있는 시작점 상태(`LyraSkeleton.cpp`의 `IMPLEMENT_PRIMARY_GAME_MODULE`만 존재)다. 이후 학습 단계마다 BP 로직을 C++ 로 이식해 가는 것이 이 프로젝트의 진행 방향이다.
- 프로젝트는 과거 템플릿 이름이 `TP_Blank`였고, `Config/DefaultEngine.ini`의 `ActiveGameNameRedirects`로 `TP_Blank` → `/Script/LyraSkeleton` 리다이렉트가 유지되고 있다. 이 라인은 **제거하지 말 것** - 기존 에셋 참조가 깨진다.

## 공통 규약

### 빌드 / 실행
표준 UE 5.7 워크플로를 그대로 따른다 (`$UE = UE 5.7 설치 경로`, 보통 `C:\Program Files\Epic Games\UE_5.7`).

```powershell
# Visual Studio / Rider 솔루션 재생성
& "$UE\Engine\Build\BatchFiles\GenerateProjectFiles.bat" -Project="D:\Projects\Testing\LyraSkeleton\LyraSkeleton.uproject" -game -rocket

# 에디터 타겟 빌드 (Development Editor)
& "$UE\Engine\Build\BatchFiles\Build.bat" LyraSkeletonEditor Win64 Development -Project="D:\Projects\Testing\LyraSkeleton\LyraSkeleton.uproject" -WaitMutex

# 에디터 실행
& "$UE\Engine\Binaries\Win64\UnrealEditor.exe" "D:\Projects\Testing\LyraSkeleton\LyraSkeleton.uproject"

# 패키징
& "$UE\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun -project="D:\Projects\Testing\LyraSkeleton\LyraSkeleton.uproject" -platform=Win64 -clientconfig=Development -build -cook -stage -pak -archive -archivedirectory="D:\Projects\Testing\LyraSkeleton\Build"
```

- 빌드 타겟은 `LyraSkeletonTarget`(게임), `LyraSkeletonEditorTarget`(에디터) 두 개뿐이다.
- 자동화 테스트·lint·정적 분석은 현재 구성되어 있지 않다. IDE는 Rider(`.idea/`) 와 Visual Studio(`.vsconfig`) 양쪽이 사용 중.

### 핵심 아키텍처 (어디서 무엇을 찾을지)
- **C++ 모듈** (`Source/LyraSkeleton/`): 현재는 게이트키퍼 수준이다. `LyraSkeleton.Build.cs` 는 `Core`, `CoreUObject`, `Engine`, `InputCore`, **`EnhancedInput`** 에 의존한다 - 입력은 Enhanced Input 기반.
- **블루프린트 게임플레이** (`Content/ALS/`):
  - `BP_LsGameMode` - 기본 맵(`Content/Maps/L_Start.umap`)의 GameMode.
  - `Characters/BP_LsCharacter` - 메인 캐릭터(Pawn). 입력·무기 전환·애님 상태가 여기에 모임.
  - `Characters/ABP_Base` + `ABP_Layers`/`ABP_Pistol`/`ABP_UnArmed` - **레이어드 애님(Linked Anim Layer)** 구조. 무기 상태별 상위 바디 포즈를 갈아끼우는 방식이라, 새 무기/상태 추가 시 같은 레이어 인터페이스를 따르는 ABP 를 만들어 끼운다.
  - `Interfaces/ALI_Animation` - AnimBP ↔ Character 간 통신용 Animation Layer Interface.
  - `Enums/E_Weapon` - 무기 식별 enum. 무기 전환과 ABP 레이어 매핑의 키.
  - `Inputs/IMC_ALS` (Input Mapping Context), `Inputs/InputActions/IA_Move`/`IA_Look`/`IA_SwitchWeapon`.

### 렌더링 / 엔진 옵션 (주의)
다음 기능이 **프로젝트 차원에서 켜져 있다**. 셰이더 빌드 시간·디스크/메모리 비용·셰이더 모델 요구 사항에 영향이 크므로 함부로 비활성화하지 말 것 (`Config/DefaultEngine.ini`):

- DX12 + **SM6** (Win64), Linux/Mac 도 Vulkan/Metal SM6.
- **Lumen** (Dynamic GI = 1, Reflection Method = 1) + Virtual Shadow Maps + Mesh Distance Fields.
- **Substrate** (`r.Substrate=True`, GBuffer Format 0).
- **Ray Tracing** 활성화 (`r.RayTracing=True`, `RayTracingProxies` 포함).
- AutoExposure Extended Range + Local Exposure 톤.

### 인덱싱 제외 경로 (`.claudeignore`)
다음은 의도적으로 검색 대상에서 제외된다. 이 안의 내용을 근거로 작업하지 말 것:
- `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` - 빌드 산출물.
- `Plugins/Developer/*` - RiderLink 등 IDE 연동용 개발 플러그인(전체 디렉토리가 ignore됨).
- `Plugins/**/Intermediate/*`, `Plugins/**/Binaries/*`.
- `.vs/`, `.idea/`, `.vscode/`, `*.vsconfig`, `*.sln`, `.claude/`, `.junie`.

## 참고 문서

| 문서 | 내용 |
|---|---|
| [docs/CodingStandard.md](docs/CodingStandard.md) | C++/에셋 네이밍, `.editorconfig` 기반 들여쓰기/인코딩, UE 매크로·리플렉션, 어서션·로깅·네트워크·애니메이션 등 **모든 코딩 룰**. 새 코드를 작성하기 전 23장 체크리스트 확인. |
| [docs/Research_UE_Asset_Analyze.md](docs/Research_UE_Asset_Analyze.md) | Monolith MCP(`tumourlove/monolith`) 단독으로 본 프로젝트 BP·AnimBP·데이터 자산을 분석·문서화할 때의 가능 범위·퀄리티·갭을 자산 타입별 매트릭스로 평가. 자동화 신뢰도 높은 부분 / 사람 보충 필요 부분, 토큰 예산, 출력 스키마, 위험 완화 절차. |
