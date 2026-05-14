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

```bash
git clone <REPO_URL> LyraSkeleton
cd LyraSkeleton
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

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Claude Code 작업 가이드. 프로젝트 목적·공통 규약·빌드/실행·핵심 아키텍처. |
| [docs/CodingStandard.md](./docs/CodingStandard.md) | UE C++ 코딩 표준. 네이밍, IWYU, UPROPERTY, 어서션·로깅·네트워크·애니메이션 등 작성 규약. |
| [docs/Research_UE_Asset_Analyze.md](./docs/Research_UE_Asset_Analyze.md) | Monolith MCP 단독으로 BP 자산을 분석·문서화할 때의 가능 범위와 퀄리티 평가. |
