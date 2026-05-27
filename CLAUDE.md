# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작성 규약 (모든 산출물 공통)

- 기본 응답 언어는 **한국어**.

### 본문 특수문자 정책

본 저장소의 모든 마크다운 / HTML 본문은 **한글과 ASCII 구두점** 으로 쓴다. 특수문자는 (1) 본 프로젝트 HTML 의 UI 컴포넌트가 요구하는 그래픽, (2) 원문 식별자 / 코드 안의 문자, (3) ASCII 로 대체하면 의미가 달라지는 수식만 허용한다.

본 정책은 [LyraStarterGame 의 `docs/common/dynamic-html-spec.md` "본문 특수문자 사용 규칙"](file://D:/Projects/Guide/LyraStarterGame/docs/common/dynamic-html-spec.md) 절을 본 저장소의 컨텍스트에 맞게 가져온 것이다.

#### 금지 글리프 (FAIL - 본문에 절대 사용 금지)

| 글리프 | 권장 대체 |
|--------|-----------|
| `—` (em dash, U+2014) | ` - ` (공백 + ASCII 하이픈 + 공백), 또는 `:` (콜론), 또는 새 문장 분리 |
| `–` (en dash, U+2013) | `~` (범위), 또는 ` - ` (ASCII 하이픈) |
| `§` (section sign) | **`섹션 N.M`** (예: `§2.3` 같은 표기 대신 `섹션 2.3`) |
| `¶` `※` `† ‡` | `단락` / `주의` / `참고` 또는 본문 풀어 쓰기 |
| `(1)` `(2)` `(3)` ... `(9)` (U+2460~U+2468) | 본문 번호 매김은 `1.` `2.` `3.` (ASCII + 마침표 + 공백). 표 안 식별자 분기는 `(1)` `(2)` `(3)` |
| `✅` `❌` `⚠` `❗` `‼` `‽` | `완료` / `검증 완료` / `확인` / `실패` / `불가` / `금지` / `주의` / `경고` 한글 텍스트, 또는 `<strong>` |
| `★` `☆` (본문 산문 안) | `핵심` / `중요` 한글 텍스트, 또는 `<strong>` |
| `×N` (개수 표기 용도) | `N개` |
| 임의 이모지 (얼굴 · 불 · 전구 · 과녁 같은 그림 글리프) | 의미의 한글 명사 / 동사 |

#### 좁은 화이트리스트 (꼭 필요한 역할만)

| 글리프 | 허용 위치 |
|--------|-----------|
| `≥` `≤` `≠` `≈` `×` `Σ` `∑` | 본문 수식 (예: `Health ≤ 0`, `Σ(weight)`) - ASCII 로 풀면 의미가 흐려지는 경우만 |
| `★` | **본 저장소의 HTML 강조 박스 (`.info.ai`) 의 `<span class="ico">` 자리에 한해 정당화된 UI 글리프**. 본문 산문에서는 금지. |
| 원문 식별자 안의 모든 글리프 | 코드 (`` `…` `` 또는 `<code>`), GameplayTag, 에셋 경로, C++ 식별자 안 그대로 (예: `Cosmetic.AnimationStyle.Feminine` 의 `.`) |
| 스마트 따옴표 `' ' " "` | 인용문, 외부 원문 그대로 보존할 때 |

#### 경고 글리프 (WARN - 정당화 필요, 남용 금지)

| 글리프 | 허용되는 좁은 용도 | 남용 사례 (금지) |
|--------|---------------------|------------------|
| `·` (가운뎃점) | 제목 / 표 셀의 짧은 키워드 병렬 (예: "A · B · C") | 산문 한 문장에 여러 번, "와/과" 로 풀 수 있는 곳 |
| `→` `←` | 인과 / 진행 관계 (`Ability → Montage → Slot`), 페이지 네비게이션 | 단순 화살표 장식 |
| `↔` | 대응 관계가 의미 핵심인 곳 | "와/과" 로 풀 수 있는 곳 |
| `…` (ellipsis) | 코드 예시의 생략 | 산문의 말 줄임 (마침표로) |

원칙: 위 글리프를 쓸 때마다 "한글 단어 / 접속사로 풀 수 있는가" 자문. 풀 수 있으면 풀어 쓴다.

#### 빈 값 표기

표 셀의 "값 없음" 을 `—` (em dash) 로 표기하지 않는다. `(없음)` 한글로 명시.

#### 번호 ↔ 제목 구분자

목록 / 카드 / 학습 목차의 번호와 제목 사이는 **마침표 (`.`) + 공백** 한 가지로 통일.

| 잘못된 표기 | 올바른 표기 |
|------------|-------------|
| `1 · 다섯 계층` | `1. 다섯 계층` |
| `2: 데이터 모델` | `2. 데이터 모델` |

### 기타 한 줄 규약

- 영문 코드 / 식별자 / 엔진 클래스 이름은 원문 그대로 (한글 음차 금지).
- 설명 / 분석 / 문서 본문은 한국어.

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

| 문서 / 위치 | 내용 |
|---|---|
| [docs/CodingStandard.md](docs/CodingStandard.md) | C++/에셋 네이밍, `.editorconfig` 기반 들여쓰기/인코딩, UE 매크로·리플렉션, 어서션·로깅·네트워크·애니메이션 등 **모든 코딩 룰**. 새 코드를 작성하기 전 23장 체크리스트 확인. |
| [docs/Research_UE_Asset_Analyze.md](docs/Research_UE_Asset_Analyze.md) | Monolith MCP(`tumourlove/monolith`) 단독으로 본 프로젝트 BP·AnimBP·데이터 자산을 분석·문서화할 때의 가능 범위·퀄리티·갭을 자산 타입별 매트릭스로 평가. 자동화 신뢰도 높은 부분 / 사람 보충 필요 부분, 토큰 예산, 출력 스키마, 위험 완화 절차. |
| `Plugins/Monolith/` (vendor, `tumourlove/monolith` v0.15.0 기준) | Claude 가 본 프로젝트 BP·AnimBP·데이터 자산을 분석할 때 사용하는 MCP 서버 플러그인. 사용법·능력·한계는 위 `Research_UE_Asset_Analyze.md` 참조. **서브모듈이 아니라 본 저장소에 직접 포함** 되어 있으므로 별도 init 명령 없이 일반 클론만으로 받는다 (monolith upstream 의 nested wiki `.gitmodules` 누락 회피를 위한 결정 - 상세 배경과 monolith 업데이트 절차는 [README.md](README.md) 의 "1. 저장소 클론" 절). |
