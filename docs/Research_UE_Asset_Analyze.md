# Monolith MCP 로 본 프로젝트 BP 분석·문서화 가능 범위와 퀄리티

> 작성 목적: 본 프로젝트 `Content/ALS/` 의 블루프린트와 데이터 자산을 **Monolith MCP 단독** 으로 Claude 가 읽고 마크다운 설계 문서를 만들 수 있는지, 그리고 자산 타입별로 어느 정도 퀄리티가 나오는지 평가한다. 다른 분석 도구는 본 문서 9 절(각주) 에 한 줄씩만 정리한다.

> 사실은 2026-05-14 시점 1 차 자료 기반. "확인됨" / "추정" / "미확인" 을 명시 분리한다.

## 0. 결론 (헤드라인)

**가능하다. 다만 자산 종류별 퀄리티 편차가 크다.** 본 프로젝트 자산을 기준으로:

- **BP class · EventGraph · 의존성 · State Machine 토폴로지** 는 거의 100% 자동화된다.
- **AnimGraph 의 핀 흐름**, **transition 조건 그래프**, **IMC 키 매핑** 은 Monolith 가 응답에 담지 않는다. 즉 "전체를 한 번에 마크다운으로" 가 아니라 "Monolith 가 강한 부분은 자동, 약한 부분은 사람·UE Python 보충" 으로 갈라진다.

## 1. Monolith MCP 기본 정보 (확정)

- **저장소**: `tumourlove/monolith` ( https://github.com/tumourlove/monolith )
- **라이선스**: MIT
- **UE 버전**: **UE 5.7+ 명시 지원** (5.7 미만 미지원). 본 프로젝트와 일치.
- **최근 릴리스**: v0.14.10 (2026-05-09).
- **활성도**: 105 stars / 31 forks.

> 작성자 식별 주의: 사용자 메모의 후보 "kvanten" 과 실제 owner `tumourlove` 는 다른 인물이다. `kvanten` 은 별개 저장소 `kvick-games/UnrealMCP` 의 별칭일 가능성이 추정되나 확인 실패. 본 문서가 평가하는 대상은 `tumourlove/monolith` 다.

총 ~20 tools, 16 네임스페이스, **1,226 actions**. 본 평가에서 사용하는 핵심 네임스페이스: `blueprint_query` (89), `animation_query` (118), `project_query` (자산 인덱서), `editor_query`.

## 2. 본 프로젝트 자산별 분석 가능도 (매트릭스)

본 평가에서 다루는 자산:
- `BP_LsCharacter`, `BP_LsGameMode`
- `ABP_Base`, `ABP_Layers`, `ABP_Pistol`, `ABP_UnArmed`
- `ALI_Animation`
- `IMC_ALS`
- `IA_Move`, `IA_Look`, `IA_SwitchWeapon`
- `E_Weapon`
- `L_Start.umap`

| 자산 | 사용 액션 | 분석 가능도 | 자동 문서화 가능 부분 | 손실되는 정보 |
|---|---|---|---|---|
| `BP_LsCharacter`, `BP_LsGameMode` | `blueprint_query.*` 전체 | **상** | 부모 클래스, 컴포넌트 트리(트랜스폼 포함), 변수 표, 함수 시그니처(로컬 변수 포함), CDO 디폴트, 구현 인터페이스, EventGraph 의사코드(Branch True/False, ForEachLoop LoopBody/Completed 핀 이름 보존), `project_query.find_references` 양방향 의존성 | 노드 색상, 그래프 코멘트 박스 그루핑 |
| `ABP_Base`/`Layers`/`Pistol`/`UnArmed` (AnimInstance) | EventGraph 는 `blueprint_query`, AnimGraph 는 `animation_query` | **중상** | 스켈레톤, 그래프 수, State Machine 의 state 목록 + transition(from/to/blend_mode/duration), Linked Anim Layer 매핑(함수 ↔ ABP), `get_abp_linked_assets` 의 자산 풀, 변수 | **State 안의 sequence/blendspace 자산 매핑 없음**, **transition rule graph(전이 조건 bool) 미노출**, AnimGraph 노드의 핀 연결은 `connections=count` 만 |
| `ALI_Animation` (Animation Layer Interface) | `get_interfaces`, `get_interface_functions` (호스트 BP 관점) | **중** (추정 영역 포함) | ABP 가 구현한 ALI 함수 이름 | ALI 를 `asset_path` 로 직접 호출해 함수 시그니처를 받는 경로는 1 차 자료 미확정 |
| `IMC_ALS` (Input Mapping Context) | **전용 인덱서 없음** | **하** | 없음 | **키 → IA 매핑, Modifier, Trigger 전부 미추출**. `InputActionIndexer` 는 IA 만, IMC 는 인식하지 않음 (소스 확인) |
| `IA_Move`/`IA_Look`/`IA_SwitchWeapon` | `project_query.get_asset_details` | **중** | Value Type, Description, Consume Input, Trigger When Paused, Trigger 클래스명 배열, Modifier 클래스명 배열 | Trigger/Modifier 의 세부 파라미터(ActuationThreshold 등) |
| `E_Weapon` (UserDefinedEnum) | `project_query.get_asset_details` | **중** | 항목별 name, display_name, value | 항목별 tooltip/description |
| `L_Start.umap` | `project_query.get_asset_details` (`LevelIndexer`) | **중** | persistent level 의 액터 name/label/class/location/rotation/scale + 컴포넌트(name/class) | 서브레벨, WorldSettings, 레이어 |

## 3. 자동화 신뢰도 높은 마크다운 산출물

자산 1 개당 다음 항목들은 거의 사람 검수 없이 생성된다 (Monolith 응답이 환각 위험 없이 정확한 표현을 제공).

- **클래스 메타 표**: parent class, blueprint_type, has_tick, has_construction_script, 변수/함수/인터페이스/컴포넌트 개수. `blueprint_query.get_blueprint_info` 한 호출.
- **변수 표 9 컬럼**: 이름·타입·디폴트값·카테고리·instance_editable·blueprint_read_only·expose_on_spawn·replicated·transient. `get_variables`.
- **함수 표**: 입출력 핀·is_pure·is_const·is_static·category·description·로컬 변수. `get_function_signature.local_variables` 가 그래프 덤프 없이도 함수 안의 로컬 변수를 emit.
- **컴포넌트 트리**: 상대 트랜스폼(location/rotation/scale) 포함. `get_components` + `get_component_details`.
- **EventGraph 의사코드 재구성**: `connected_to=["NodeName.PinName"]` 가 핀 이름까지 보존하므로 다음 형태로 환각 없이 재현 가능.
  ```
  OnInteract
    Branch(IsValid)
      True:  ForEachLoop
              LoopBody:  CallFunction(ApplyEffect)
              Completed: Return
      False: PrintString
  ```
- **State Machine 의 Mermaid `stateDiagram-v2`**: state 목록과 transition(from/to/blend_mode/duration) 만으로 자동 변환.
- **Linked Anim Layer 매핑표**: ALI 함수 ↔ 무기 상태별 ABP(UnArmed/Pistol) 슬롯. `animation_query.get_linked_layers` 가 `name`/`interface_class`/`instance_class` 세 필드를 emit.
- **BP 간 diff**: `compare_blueprints` 가 변수/컴포넌트/함수/그래프별 added/removed/modified 를 emit.
- **의존성 그래프**: `project_query.find_references` 가 hard/soft 양방향.
- **IA 의 Trigger/Modifier 종류 요약**: 클래스명까지 (세부 파라미터는 없음).
- **E_Weapon 항목 표**: name/display_name/value 3 컬럼.

## 4. 신뢰도 낮은/사람 보충 필요 부분

LLM 에 그대로 맡기면 환각 위험이 크거나 정보가 빠지는 영역:

1. **AnimGraph 흐름의 자연어 요약**. Output Pose 까지의 핀 체인이 응답에 없다. `get_blend_nodes` 는 핀별 `connections` 를 **개수** 로만 준다. "어떤 pose 가 Blend Layered per bone 의 어느 입력으로 들어가는지" 가 보이지 않으므로 LLM 이 추측으로 채우면 거짓이 만들어진다.
2. **State 전이 조건**. `get_state_machines.transitions` 는 from/to/blend_mode/duration 만. **transition rule graph 의 bool 조건(예: "Speed > 50 일 때 Idle → Walk")** 이 통째로 빠진다. State Machine 의 가장 중요한 정보 축 한 개가 비어 있다.
3. **State 안의 애니메이션 자산 매핑**. `get_state_info.nodes` 가 class/title 배열만 반환. 어떤 state 에 어떤 BlendSpace/Sequence 가 물려 있는지가 자동 매핑되지 않음. `get_abp_linked_assets` 는 ABP 전체 자산 풀만 제공.
4. **그래프 코멘트 박스 그루핑**. 노드별 NodeComment(우클릭 → Add Node Comment) 는 보인다. 그러나 학습 BP 가 영역을 나누는 **코멘트 박스 (`UEdGraphNode_Comment`)** 의 영역 메타가 별도 emit 되지 않는다.
5. **IMC 의 키 매핑**. 인덱서 자체가 IMC 를 무시한다. `IMC_ALS` 의 "WASD → IA_Move, Mouse XY → IA_Look" 정보는 Monolith 단독으로 0%.
6. **노드 색상/카테고리 시각 단서**. SerializeNode 필드에 없음.
7. **의도/디자인 컨텍스트**. "왜 이런 구조인가" 는 어떤 도구로도 자동화 불가, 사람 보충 필수.

## 5. 자산별 자동화 비율 추정

| 자산군 | 자동화율 추정 | 사람 보충 필요 |
|---|---|---|
| 클래스 골격 + 변수/함수/컴포넌트 표 + EventGraph 의사코드 + 의존성 + State Machine 토폴로지 | **90%+** | 의도 설명 1-2 단락 |
| AnimGraph 핀 흐름 + Transition 조건 | **30~50%** | 전이 조건은 에디터에서 직접 확인, 핀 연결은 스크린샷 또는 텍스트 보충 |
| IMC 키 매핑 | **0%** | UE Python 으로 IMC 의 매핑 배열을 덤프하거나 표 수동 작성 |
| 학습 BP 의 영역 코멘트 박스 | **0%** | 사람이 영역 구분을 추가 기술 |

본 프로젝트가 ALS 학습 골격이라 ABP 의 AnimGraph 비중이 큰 점을 감안하면, "ABP_Base 한 개를 완전한 문서로" 만들려면 사람 보충 비중이 40~60% 까지 올라갈 수 있다.

## 6. 토큰 예산의 현실

- README 가 인용한 **`~10 KB (summary)` vs `~172 KB (get_graph_data)`** 는 **GASP 수준의 복합 그래프 한 개** 기준 (BP 전체 합산 아님).
- `BP_LsCharacter` 의 EventGraph 는 ALS 캐릭터 복잡도라면 100KB 대 도달 가능 (추정).
- ABP 의 AnimGraph 응답은 핀 정보가 빠진 상태라 ABP_Base.uasset 가 84KB 여도 응답은 수 KB 수준 (추정).
- **페이지네이션은 거의 없다.** `project_query.find_by_type` 만 limit/offset 보유 (default limit=100). `blueprint_query`, `animation_query` 의 그래프 read 액션에는 페이지네이션이 없다. `get_execution_flow` 는 MaxDepth=100 하드캡.
- **SSE 스트리밍 없음**. 대용량 응답을 청크로 받을 수 없다.

권장 호출 순서:
1. `list_graphs` (그래프 목록, 가벼움)
2. 그래프마다 `get_graph_summary` (수 KB 수준)
3. 흥미로운 노드만 `get_node_details`
4. `get_graph_data` 풀 덤프는 명시적으로 필요할 때만

## 7. 설치 / 운영 / 위험

### 7.1 설치 (요약)

1. `LyraSkeleton/Plugins/Monolith/` 에 clone. 본 프로젝트는 C++ 프로젝트이므로 `LyraSkeletonEditor` Development 타겟으로 리빌드.
2. 프로젝트 루트에 `.mcp.json` 작성. **권장 옵션**: Windows 네이티브 C++ proxy (`Plugins/Monolith/Binaries/monolith_proxy.exe`). Python 의존 없음.
3. 검증: `POST http://localhost:9316/mcp {"method":"tools/list"}`.

### 7.2 운영 제약

- **UE Editor 가 항상 켜져 있어야 함** (MCP 서버는 에디터 in-process).
- 서버가 **모든 인터페이스에 바인드**. 신뢰할 수 없는 네트워크에선 OS 방화벽 규칙 필수. CORS 는 localhost 로 제한.

### 7.3 위험 (반드시 완화 절차 적용)

- 모듈별 권한이 비대칭이다. 일부는 read-only (예: SoundWave 인스펙션), 나머지(BP/Material/Animation/Niagara/Audio/Mesh) 는 **풀 CRUD = 임의 쓰기 가능**. 즉 의도치 않은 자산 수정 위험이 기본값.
- 마켓플레이스 의존 액션(Logic Driver Pro, ComboGraph) 은 조건부 컴파일.
- README 에 "tool dedupe / action allowlist/denylist" 가 언급되지만 **구체적 설정 예시가 부족** (1 차 자료 한계).

완화 절차 (도입 시 강제):

1. Git 트리가 깨끗한 상태에서 세션 시작.
2. 첫 세션은 `blueprint_query.*`, `animation_query.*`, `project_query.*` **read 액션만** 호출하기로 명시 지시.
3. 매 세션 종료 후 `git status` / `git diff` 로 `Content/` 내 변경 확인. 변경이 발견되면 즉시 stash 또는 reset 검토.
4. README 의 allowlist/denylist 옵션 실제 설정 방법을 소스/issues 에서 확정한 뒤, read 전용 프로파일을 분리한 별도 `.mcp.json` 으로 분석 세션 전용 환경을 구성.

## 8. 출력 스키마 (참조용, 1 차 자료 확인)

### 8.1 `blueprint_query.get_graph_data` 응답

- 그래프 레벨: `graph_name`, `graph_type`, `nodes`(배열).
- 노드 객체 필드: `id`(이름), `class`, `title`, `pos`(`[x, y]`), `comment`(NodeComment 가 있을 때만), `function`, `function_class`, `component_name`, `delegate_property_name`, `event_name`, `custom_name`, `delegate_owner_class`, `macro_name`, `self_context`, `pins`(배열).
- 핀 객체 필드: `id`(GUID), `name`, `direction`(`"input"`/`"output"`), `type`(예 `"array:int"`, `"struct:FVector"`), `default_value`(literal, 비어있지 않을 때), `default_object`(자산 패스), `connected_to`(`["NodeName.PinName", ...]`).

### 8.2 `blueprint_query.get_graph_summary` 응답

- `get_graph_data` 의 노드 필드에서 핀 상세를 제거한 형태. `id`/`class`/`title`/exec 연결만. `comment` 는 포함.

### 8.3 `blueprint_query.get_blueprint_info` 응답

- `asset_path`, `parent_class`, `parent_class_path`, `blueprint_type`, `compile_status`, `graph_names`, `has_tick`, `has_construction_script`, `variable_count`, `function_count`, `interface_count`, `component_count`, `generated_class`, `is_data_only`, `is_actor_based`.

### 8.4 `blueprint_query.get_variables` 응답 (변수별)

- `name`, `type`, `default_value`, `category`, `instance_editable`, `blueprint_read_only`, `expose_on_spawn`, `replicated`, `transient`.

### 8.5 `blueprint_query.get_function_signature` 응답

- `name`, `source`, `is_pure`, `is_const`, `is_static`, `call_in_editor`, `category`, `description`, `access`, `inputs`, `outputs`, **`local_variables`** (그래프 덤프 없이 로컬 변수를 emit 하는 유일한 경로).

### 8.6 `animation_query.get_abp_info` 응답

- `asset_path`, `skeleton`, `skeleton_name`, `graphs`(name, node_count, anim_node_count, state_machine_count), `state_machines`(name, graph, entry_state, state_count, transition_count, states, transitions), `variables`(name, type, default_value, is_exposed), `interfaces`.

### 8.7 `animation_query.get_state_machines` 의 transition 객체

- `from`, `to`, `from_type`, `to_type`, `cross_fade_duration`, `blend_mode`(Linear/Cubic/Other), `bidirectional`.
- **rule graph 노출 없음** (전이 조건 bool 식 자체가 빠짐).

### 8.8 `animation_query.get_state_info`

- `state_name`, `machine_name`, `position`, `nodes`(class+title 만), `node_count`.
- **상태에 들어있는 애니메이션 자산 경로 없음.**

### 8.9 `animation_query.get_blend_nodes` 응답 노드

- `class`, `title`, `connected_pins`(각 핀에 `name`, `direction`, `connections`(**개수만**)).

### 8.10 `animation_query.get_nodes` (AnimGraph)

- `class`, `title`, `position` 만. **핀, 연결, 디폴트 모두 없음.**

### 8.11 `project_query.get_asset_details`

- `success`, `asset`(중첩 객체). 내용은 호출되는 `IIndexer::GetDetails` 구현마다 다름 (InputAction/UserDefinedEnum/Level 등 인덱서별 스키마).

## 9. 다른 분석 도구 (각주, 참고만)

Monolith 단독 평가가 본 문서의 범위지만, 도입 전에 비교가 필요할 때를 위해 한 줄씩 정리한다.

- **`chongdashu/unreal-mcp`**: BP 도구가 전부 write/create. **분석 부적합.**
- **`kvick-games/UnrealMCP`**: BP 미구현. WIP.
- **Blueprint Header View** (Epic 내장, UE 5.7 공식): BP 우클릭 → "Preview Equivalent C++ Header" 로 클래스 골격을 텍스트로 추출. **이벤트 그래프 로직은 미포함**. 읽기 전용이라 안전. 본 프로젝트에서 IMC/IA/E_Weapon 같이 그래프가 없는 자산이나 클래스 골격 보강에 보조 사용 가능.
- **UE Python (`unreal.BlueprintEditorLibrary`)**: `find_event_graph(bp)` → `graph.Nodes` 순회로 핀 연결까지 인트로스펙트 가능 (Experimental). **IMC 매핑 추출용 보조** 로 가장 현실적인 우회 경로.
- **Copy Nodes 클립보드 (T3D 유사)**: 1 회성 소규모 추출에 강함. 자동화 부적합.
- **UAsset 오프라인 파서 (`UAssetAPI` 등)**: BP bytecode 디컴파일은 비목적. CI 메타데이터 보조용.

## 10. 미확인 / 추정 항목 (도입 전 재확정 필요)

- `ALI_Animation` 자체를 `asset_path` 로 직접 인스펙션해 함수 시그니처를 받는 경로의 응답 스키마는 1 차 자료에서 미확정.
- 코멘트 박스 노드(`UEdGraphNode_Comment`) 가 `get_graph_data` 의 노드 배열에 섞여 나오는지 (`class="EdGraphNode_Comment"`) 는 소스에 명시 분기가 없어 **사실상 미노출** 로 판단했으나 실측 검증 필요.
- `animation_query.get_abp_info` 의 `interfaces` 배열이 ALI 를 포함하는지 vs 일반 BP 인터페이스만 포함하는지는 추정 (소스에서 필드 emit 은 확인됨).
- `BP_LsCharacter` 의 `get_graph_data` 실제 바이트 크기는 직접 호출해야 확정. README 의 "172KB" 는 GASP 수준의 다른 BP 기준.
- Monolith `.mcp.json` 의 allowlist/denylist 구체적 설정 키와 동작은 1 차 자료에서 미확정. 도입 전에 소스/issues 로 재확인.
- UE Python `BlueprintEditorLibrary` 의 UE 5.7 시그니처는 공식 docs 가 5.2 까지만 공개 (보조 도구로 활용 시 검증 필요).

## 11. 출처

- [tumourlove/monolith (GitHub)](https://github.com/tumourlove/monolith)
- [Docs/API_REFERENCE.md](https://github.com/tumourlove/monolith/blob/master/Docs/API_REFERENCE.md)
- [Docs/specs/SPEC_MonolithBlueprint.md](https://github.com/tumourlove/monolith/blob/master/Docs/specs/SPEC_MonolithBlueprint.md)
- [Docs/specs/SPEC_MonolithAnimation.md](https://github.com/tumourlove/monolith/blob/master/Docs/specs/SPEC_MonolithAnimation.md)
- [Docs/specs/SPEC_MonolithIndex.md](https://github.com/tumourlove/monolith/blob/master/Docs/specs/SPEC_MonolithIndex.md)
- [Docs/specs/SPEC_MonolithLevelSequence.md](https://github.com/tumourlove/monolith/blob/master/Docs/specs/SPEC_MonolithLevelSequence.md)
- [Source/MonolithBlueprint/Private/MonolithBlueprintActions.cpp](https://github.com/tumourlove/monolith/blob/master/Source/MonolithBlueprint/Private/MonolithBlueprintActions.cpp)
- [Source/MonolithAnimation/Private/MonolithAnimationActions.cpp](https://github.com/tumourlove/monolith/blob/master/Source/MonolithAnimation/Private/MonolithAnimationActions.cpp)
- [Source/MonolithIndex/Private/Indexers/InputActionIndexer.cpp](https://github.com/tumourlove/monolith/blob/master/Source/MonolithIndex/Private/Indexers/InputActionIndexer.cpp)
- [Source/MonolithIndex/Private/Indexers/LevelIndexer.cpp](https://github.com/tumourlove/monolith/blob/master/Source/MonolithIndex/Private/Indexers/LevelIndexer.cpp)
- [Skills/unreal-blueprints/unreal-blueprints.md](https://github.com/tumourlove/monolith/blob/master/Skills/unreal-blueprints/unreal-blueprints.md)
- [Blueprint Header View Overview (UE 5.7)](https://dev.epicgames.com/documentation/unreal-engine/an-overview-of-the-blueprint-header-view-in-unreal-engine)
- [unreal.BlueprintEditorLibrary (Python, Experimental, 5.2 docs)](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/BlueprintEditorLibrary?application_version=5.2)
