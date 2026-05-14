# Unreal Engine C++ 코딩 표준 (LyraSkeleton)

> 본 문서는 Epic Games의 공식 **C++ Coding Standard for Unreal Engine** 을 1차 기준으로 삼고, 본 프로젝트(UE 5.7)에서 즉시 적용 가능한 형태로 정리한 **LyraSkeleton 의 코딩 표준**이다. **공식 표준과 충돌이 발견되면 항상 공식 표준이 우선한다.** 새 코드를 작성할 때 본 문서의 체크리스트(23장)를 한 번씩 훑고 시작할 것.

## 0. 1차 출처

- [Epic C++ Coding Standard for Unreal Engine (UE 5.7)](https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine) - 본 문서의 최상위 근거
- [Programming with C++ in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine)
- [Include What You Use (IWYU) for Unreal Engine](https://dev.epicgames.com/documentation/unreal-engine/include-what-you-use-iwyu-for-unreal-engine-programming)
- [Recommended Asset Naming Conventions](https://dev.epicgames.com/documentation/en-us/unreal-engine/recommended-asset-naming-conventions-in-unreal-engine-projects)
- 보조 자료 (검토용): [Allar/ue5-style-guide](https://github.com/Allar/ue5-style-guide), [Tom Looman 네이밍 가이드](https://tomlooman.com/unreal-engine-naming-convention-guide/), [Should I follow the Epic coding standard? - Laura](https://landelare.github.io/2022/06/23/epic-conventions.html), [OpenUnrealConventions](https://github.com/JonasReich/OpenUnrealConventions)

> Epic 공식 페이지는 5.7 기준으로 일부 항목(예: 표준 라이브러리 사용, `TEnableIf`/`TAtomic` 권장 여부 등)이 과거 4.x 시절과 달라졌다. 오래된 글에 의존하지 말고 의심스러우면 위 5.7 공식 링크를 직접 확인할 것.

---

## 1. 파일 헤더 (Copyright Notice)

- 모든 소스 파일의 **첫 줄**에 저작권 한 줄을 둔다.
- **본 프로젝트 정책 (혼재 허용)**:
  - Epic의 `*.uproject` 템플릿이 자동 생성한 기존 파일(예: `LyraSkeleton.h/.cpp`, `*.Build.cs`, `*.Target.cs`)은 Epic 헤더를 그대로 유지한다.
    ```cpp
    // Copyright Epic Games, Inc. All Rights Reserved.
    ```
  - **새로 작성하는 프로젝트 고유 파일** 은 LyraSkeleton 헤더를 사용한다.
    ```cpp
    // Copyright LyraSkeleton Learning Project. All Rights Reserved.
    ```
- 그 다음 줄은 빈 줄, 그 다음 `#pragma once` (헤더의 경우).

---

## 2. 명명 규칙 (Naming)

### 2.1 식별자 표기는 **PascalCase 일원화**

타입·변수·함수·열거자·매크로 인자명까지 모두 PascalCase. Epic 표준은 camelCase 를 사실상 쓰지 않는다. 약어도 단어로 취급한다 - `URLString`이 아니라 `UrlString`.

### 2.2 타입 접두사 (필수)

| 접두사 | 적용 대상 | 본 프로젝트 예시 (Ls 프로젝트 접두사 적용) |
|---|---|---|
| `U` | `UObject` 상속 | `ULsAnimInstance`, `ULsWeaponComponent` |
| `A` | `AActor` 상속 | `ALsCharacter`, `ALsPlayerController` |
| `S` | `SWidget` 상속 (Slate) | `SLsHudPanel` |
| `I` | 추상 인터페이스 | `ILsInteractable` |
| `E` | 열거형 (`enum class`) | `ELsGait`, `ELsWeaponType` |
| `T` | 템플릿 | `TArray`, `TSubclassOf` (UE 표준) |
| `F` | 그 외 거의 모든 일반 클래스/구조체 | `FLsLocomotionState`, `FVector` (UE 표준) |

> **본 프로젝트의 식별자 접두사 정책**: UE 타입 접두사 뒤에 **`Ls`** (LyraSkeleton 의 축약) 를 붙여 시작한다. 즉 형태는 `[U/A/F/E/I/S]Ls<이름>`. 짧은 접두사 덕에 IDE 자동완성과 UPROPERTY Category UI 폭을 모두 절약한다.
>
> **`Ls` 가 붙지 않는 식별자**: 모듈 자체(`public class LyraSkeleton : ModuleRules`), API 매크로(`LYRASKELETON_API`), 모듈 진입 파일(`LyraSkeleton.h/.cpp`) - 이들은 *모듈 전역 식별자* 라 항상 `LyraSkeleton` 그대로 유지한다.

> 위 접두사는 **C++ 식별자에만** 적용된다. 파일 이름과 에셋 이름에는 별도 규칙(아래 2.6, 2.7, 2.8)을 따른다.

### 2.3 부울 변수는 `b` 접두사 (필수)

- `bIsFiring`, `bHasFadedIn`, `bPendingDestruction` - `b` + PascalCase.
- 멤버이든 지역이든 동일.

### 2.4 함수와 매개변수

함수명은 의미 분류에 따라 다음 규약을 따른다.

| 분류 | 형태 | 예 |
|---|---|---|
| 명령형 동작 | 동사로 시작 | `CalculateAimOffset()`, `UpdateRotationData()`, `ApplyDamage()`, `BuildPath()`, `Reset()` |
| 질의/접근자 | `Get` / `Is` / `Has` / `Can` / `Should` | `GetVelocity()`, `IsFalling()`, `HasAuthority()`, `CanJump()`, `ShouldTickIfViewportsOnly()` |
| 엔진 콜백·관례 | **엔진 관례 우선** (동사 규칙보다 우선한다) | `BeginPlay`, `Tick`, `EndPlay`, `SetupPlayerInputComponent`, `NativeInitializeAnimation`, `NativeUpdateAnimation`, `BlueprintInitializeAnimation` |
| Replication 콜백 | `OnRep_<속성명>` | `OnRep_Health`, `OnRep_CurrentWeapon` |
| RPC | `Server` / `Client` / `Multicast` 접두사 | `Server_Fire()`, `Client_NotifyHit()`, `Multicast_PlayCue()` |

매개변수 규칙:

- 참조/포인터로 **출력**되는 매개변수에는 `Out` 접두사. `void GetVelocity(FVector& OutVelocity)`.
- 입력임을 명시할 필요가 있을 때 `In` 접두사. 부울이면 `bIn` / `bOut` 순서. 예: `bool bOutResult`.

### 2.5 멤버 변수

- 멤버 변수는 **PascalCase**. 헝가리언/언더스코어/`m_` 접두사를 쓰지 않는다.
- 부울 멤버만 `b` 접두사를 둔다. `bool bIsAlive;`
- `UPROPERTY` 가 붙는 변수도 동일한 규칙. (단, 블루프린트에서 노출되는 변수는 더 설명적으로 풀어쓰는 편이 좋다.)

### 2.6 상수와 매크로

- `constexpr`/`const` 전역/네임스페이스 상수는 PascalCase. (Epic 표준이 `kFoo`/`SCREAMING_SNAKE_CASE`를 강제하지 않음)
- 매크로만 `SCREAMING_SNAKE_CASE` (예: `UE_LOG`, `IMPLEMENT_PRIMARY_GAME_MODULE`).

### 2.7 파일 이름

- **타입 접두사를 파일명에 두지 않는다.** `LsAnimInstance.h` (○) / `ULsAnimInstance.h` (×). 즉 클래스명에서 UE 타입 접두사(`U`/`A`/`F`/`E`/`I`/`S`) 만 떼고 그대로 파일명으로 쓴다 - 프로젝트 접두사 `Ls` 는 파일명에도 그대로 남는다.
- `.h`/`.cpp`는 그 안의 **주된** 클래스 이름과 일치시킨다. 한 파일에 여러 타입을 두는 것은 가능하지만, 파일명을 결정한 주 타입은 같은 모듈/폴더 내 다른 파일과 이름 충돌이 없어야 한다.

### 2.8 에셋 이름

C++ 코딩 표준은 아니지만 본 프로젝트에서 함께 통일한다. 자세한 표는 위 Tom Looman / Allar 가이드 참고.

| 종류 | 접두사 | 본 프로젝트 실제 예 |
|---|---|---|
| Blueprint | `BP_` | `BP_LsCharacter`, `BP_LsGameMode` |
| Animation Blueprint | `ABP_` | `ABP_Base`, `ABP_Layers`, `ABP_Pistol`, `ABP_UnArmed` |
| Animation Layer Interface | `ALI_` | `ALI_Animation` |
| Anim Sequence / Montage | `AS_` / `AM_` | `AM_Rifle_Fire` |
| Input Mapping Context | `IMC_` | `IMC_ALS` |
| Input Action | `IA_` | `IA_Move`, `IA_Look`, `IA_SwitchWeapon` |
| Enum (콘텐츠) | `E_` | `E_Weapon` |
| Level / Map | `L_` | `L_Start` |
| Skeletal / Static Mesh | `SK_` / `SM_` | `SK_Mannequin` |
| Material / Instance | `M_` / `MI_` | `MI_Body_Hero` |
| Texture | `T_` (+ `_D/_N/_M/_R/_AO`) | `T_Hero_D` |

> **에셋의 프로젝트 태그 (`Ls`)**: 게임플레이 단위 블루프린트(BP)에는 프로젝트 태그를 붙인다 - `BP_LsCharacter`, `BP_LsGameMode`. 반면 보조 에셋(ABP/ALI/IMC/IA/E_/L_ 등)에는 태그를 붙이지 않는다. 새 에셋을 추가할 때 이 패턴을 깨지 말 것.

---

## 3. 정수·문자형 별칭과 문자열

### 3.1 정수·문자형 별칭

- C++ 기본형 대신 UE 이식성 별칭을 사용한다. **직렬화/리플렉션 대상에서는 특히 강제.**
  - 부호 있는 정수: `int8` / `int16` / `int32` / `int64` (`int` 금지에 가까움 - 특히 `UPROPERTY` 위에서는 `int32`).
  - 부호 없는 정수: `uint8` / `uint16` / `uint32` / `uint64`.
  - 문자: `TCHAR`. 사이즈: `SIZE_T`.
  - `bool`/`float`/`double` 은 그대로 사용.

### 3.2 문자열 리터럴 매크로

- 문자열 리터럴은 **항상 `TEXT("...")`** 매크로로 감싼다. `FString S = TEXT("Hello");`
- 로컬라이즈가 필요한 UI 문자열은 `LOCTEXT(...)`, 로컬라이즈 불필요한 개발자용 UI는 `INVTEXT(...)`.
- 문자열 결합은 `FString::Printf(TEXT("...%s..."), *Other)` 또는 `+=`. `*FString` 은 `TCHAR*` 변환.

### 3.3 `FName` / `FString` / `FText` 선택 기준

세 타입은 용도가 분명히 다르다. 잘못 선택하면 메모리·로컬라이즈·해시 검색 비용에서 즉시 손해를 본다.

| 타입 | 용도 | 선택 기준 |
|---|---|---|
| `FName` | 식별자·키·태그 | 비교가 잦고 값이 거의 변하지 않으며 **사람이 읽지 않는** 이름 (Bone 이름, GameplayTag 식별자, 에셋 키, 파라미터 키). 대소문자 구분 없는 비교, 빠른 해시. |
| `FString` | 런타임 조합·파싱·로깅 | 동적으로 만들고 합치거나 자르는 일반 가변 문자열. UI에 직접 표시하지 않음. |
| `FText` | 사용자에게 표시되는 텍스트 | 로컬라이즈 대상. UI 라벨, 대화, 알림. 항상 `LOCTEXT`/`NSLOCTEXT` 또는 `FText::Format` 으로 만든다. `FText` ↔ `FString` 변환은 의도적으로만. |

- 에셋 경로를 **하드코딩한 `FString`** 으로 들고 다니지 말 것. `TSoftObjectPtr<T>`, `TSoftClassPtr<T>`, 또는 Data Asset/Config 로 외부화한다.

---

## 4. const 정확성

- 멤버 함수가 상태를 바꾸지 않으면 **항상** `const` 를 붙인다.
- 포인터/참조 매개변수가 입력 전용이면 `const`. `void DoX(const FVector& In)`.
- **값 반환에는 `const` 를 붙이지 않는다** (`const FVector GetPosition()` 같은 형태는 지양). 반환되는 포인터/참조에 한해 `const`가 의미를 가진다.
- 전역/네임스페이스 상수는 `const` 또는 `constexpr`.

---

## 5. 매개변수 전달 규약 (C++ Core Guidelines F.15 준용)

| 타입 | 입력(읽기 전용) | 출력/수정 |
|---|---|---|
| 저렴(int32, FVector, 포인터, `TUniquePtr` 등 small) | 값 전달 | `Out` 참조 |
| 이동·복사 비용 큼(`FString`, `TArray<T>`) | `const T&` | `T&` 또는 반환값 |
| 다형 객체 | `const T*`/`T*` (널 의미 있을 때) 또는 `const T&` | `T&` |

---

## 6. 모던 C++ 기능 사용 지침

본 프로젝트 코드는 UE 5.7 기준 **C++20** 환경에서 빌드된다(엔진 기본). 그러나 Epic 표준은 일부 모던 기능에 보수적이므로 다음 지침을 따른다.

| 기능 | 지침 |
|---|---|
| `nullptr` | **필수**. `NULL`/`0` 금지. |
| `override` / `final` | virtual 재정의에 **항상** `override` 를 붙인다. 더 이상 재정의 불가하면 `final`. |
| `auto` | **신중히** 사용. 람다·이터레이터·템플릿 표현식·반복문 변수 등 타입 표기가 더 큰 잡음을 만드는 곳에 한정. 일반 지역 변수에 무분별 `auto` 금지. |
| 범위 기반 for | 권장. `for (FAnimInfo& Info : Infos)` |
| 람다 | 짧게. **명시 캡처**(`[this]`, `[&Vec]`) 사용, `[&]`/`[=]` 통째 캡처 지양. trailing return 가독성 좋을 때 사용. |
| `enum class` | 단순 `enum` 대신 거의 항상 `enum class : uint8`. 리플렉션 대상이면 `UENUM(BlueprintType)` + 기반 타입 명시 필수. |
| `constexpr` | 가능한 곳에 사용. 컴파일 타임 상수에는 `#define` 보다 우선. |
| `static_assert` | 컴파일 타임 가정 검증에 적극 사용. |
| 구조적 바인딩(`auto [a,b] = …`) | Epic 사내에서는 사용 금지로 알려져 있음 - **본 프로젝트도 사용하지 않는다.** |
| `std::move` / `std::forward` | UE 매크로 `MoveTemp(...)` / `Forward<T>(...)` 사용. |
| `using` 별칭 | `typedef` 보다 `using` 우선. |

---

## 7. 표준 라이브러리(STL) 사용 정책

> 이 항목은 4.x 시절 자료와 5.x 자료가 가장 많이 어긋나는 지점이다. **5.7 공식 표준을 직접 확인할 것.** 아래는 본 프로젝트에서 채택하는 절충 규칙.

- **컨테이너는 UE 컨테이너를 우선** - `TArray`, `TMap`, `TSet`, `TQueue`. `std::vector`, `std::map` 등은 외부 코드 경계에서만.
- **비-UObject 자원의 스마트 포인터** - `TUniquePtr`, `TSharedPtr`, `TWeakPtr` 사용. (`std::unique_ptr` 직접 사용 지양)
- **UObject 는 표준/UE 스마트 포인터로 감싸지 않는다.** `new`/`delete`/`TUniquePtr`/`TSharedPtr` 모두 금지. UObject 의 생성·소유·소멸은 다음 API를 사용한다.

  | 상황 | API |
  |---|---|
  | Actor 의 기본 컴포넌트 (생성자에서) | `CreateDefaultSubobject<UFooComponent>(TEXT("Foo"))` |
  | 런타임 임의 UObject 생성 | `NewObject<UFooObject>(Outer)` |
  | 런타임 Actor 생성 | `World->SpawnActor<AFoo>(...)` |
  | Actor 파괴 | `Actor->Destroy()` (직접 `delete` X) |

  UObject 멤버 참조는 다음 표를 따른다.

  | 의도 | 권장 형태 |
  |---|---|
  | 소유 또는 강한 GC 참조 (객체 생존 보장 필요) | `UPROPERTY()` + `TObjectPtr<UFoo>` |
  | 비소유 약참조 (대상 사라질 수 있음, 장기 보관) | `TWeakObjectPtr<UFoo>` |
  | 클래스 메타 참조 (강) | `UPROPERTY()` + `TSubclassOf<UFoo>` |
  | 에셋·클래스 지연 로딩 | `TSoftObjectPtr<UFoo>` / `TSoftClassPtr<UFoo>` |
  | 함수 매개변수·지역 변수·즉시 사용 임시 | raw `UFoo*` |

- **이동 의미** - `MoveTemp(X)` (UE), `Forward<T>(X)`. `std::move` 직접 호출 금지.
- **5.x 이후 변경점** - `std::atomic`, `std::is_same_v` 등 일부 STL 트레이트는 UE 자체 대체보다 **선호**되도록 표준이 갱신되었다. 새 코드에서는 deprecated 된 `TEnableIf`, `TAtomic` 등을 끌어오지 말 것.

---

## 8. 캐스팅

- UObject 다운캐스트는 **반드시** `Cast<UFoo>(Obj)` 사용. 실패 시 `nullptr` 반환이므로 결과를 항상 검사한다.
- POD/비-UObject 변환은 `static_cast<T>()`. C 스타일 `(T)x` 캐스트 금지.
- `const_cast`, `reinterpret_cast` 사용은 정당화 주석을 단다.
- 인터페이스 캐스트는 `Cast<IFoo>(Obj)` 또는 `Obj->Implements<UFooInterface>()` 후 `Cast<IFoo>(Obj)` 패턴.

---

## 9. 헤더 포함(include) 정책 - IWYU 기준

UE 5는 IWYU(“Include What You Use”) 모델을 따른다.

1. **선언이 등장하는 곳까지 포함을 좁힌다.** 멤버에 `UFoo*` 만 쓴다면 헤더에서는 전방 선언 (`class UFoo;`) 만 두고, 정의가 필요한 `.cpp` 에서 `#include "Foo.h"`.
2. **새 헤더 첫 줄(저작권 다음)** 은 보통 `#pragma once`. `CoreMinimal.h` 는 매우 흔하지만 IWYU 모드에서는 정말로 필요한 헤더만 포함하는 쪽이 권장된다.
3. **`.cpp` 의 첫 `#include` 는 자기 자신의 헤더**. 그 다음 같은 모듈의 헤더, 다른 모듈 헤더, 표준 헤더 순. 같은 그룹 안에서는 알파벳 정렬을 권장한다(머지 충돌 감소).
4. `UCLASS`/`USTRUCT` 가 들어가는 헤더의 **마지막 include** 는 반드시 그 파일의 generated 헤더:
   ```cpp
   #include "MyClass.generated.h"
   ```
   이 줄은 항상 다른 모든 include 뒤에 와야 한다.
5. PCH 의존을 가정하고 include 를 빼먹지 말 것 - IWYU 기준에서는 PCH 가 없어도 빌드되어야 한다.

전방 선언으로 충분한 대표 케이스: 포인터/참조 멤버, 함수 시그니처의 매개변수 타입, 반환 타입(값 반환이라 해도 정의 호출이 헤더에서 일어나지 않는다면). enum 도 `enum class EFoo : uint8;` 형태로 전방 선언 가능.

---

## 10. 클래스 레이아웃과 캡슐화

헤더 안 선언 순서는 다음을 권장한다 (Epic 일관 양식).

1. `UCLASS(...)` / `USTRUCT(...)` 매크로
2. `class UFoo : public UBar` 선언과 `GENERATED_BODY()`
3. **public:** 생성자/소멸자 → 공용 API → 콜백
4. **protected:** virtual 오버라이드 → 보호된 헬퍼
5. **private:** 내부 헬퍼와 데이터 멤버

- 멤버 변수는 가능한 한 `private:` 또는 `protected:` 에 두고, 외부 접근이 필요하면 `UPROPERTY` 메타 + 접근자 함수로 노출.
- `GENERATED_BODY()` 는 **첫 줄**에 두며 그 위에 다른 코드가 오면 안 된다.

---

## 11. UE 매크로 작성 관례

```cpp
UCLASS(BlueprintType, Blueprintable)
class LYRASKELETON_API ULsSampleComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ls|Sample",
              meta = (ClampMin = "0.0"))
    float SampleScalar = 1.0f;

    UFUNCTION(BlueprintCallable, Category = "Ls|Sample")
    void ApplySample(const FVector& InOffset);

private:
    UPROPERTY(Transient)
    TObjectPtr<UStaticMeshComponent> CachedMesh = nullptr;
};
```

> **프로젝트 식별자 접두사 = `Ls`**. 본 프로젝트에서 새로 작성하는 모든 C++ 타입은 UE 타입 접두사(`U/A/F/E/I/T/S`) 뒤에 **`Ls`** 를 붙여 시작한다 (예: `ULsAnimInstance`, `ALsCharacter`, `FLsLocomotionState`, `ELsGait`). 모듈명·폴더명·`LYRASKELETON_API` 매크로는 *모듈 전체 식별자* 라 그대로 `LyraSkeleton` 을 유지한다.

- `Category` 는 **항상** 지정. 형식은 `Project|Subsystem` 의 파이프 구분(예: `Ls|Animation`). UI 폭이 좁으므로 본 프로젝트는 짧은 `Ls` 접두사를 쓴다.
- UE 5.x 신규 코드의 UObject 멤버 포인터는 **`UPROPERTY()` + `TObjectPtr<T>`** 를 우선 사용한다 (에디터 내 GC/리로드 안정성). 함수 매개변수·지역 변수 등 임시는 raw `T*` 그대로 사용.
- `BlueprintCallable` / `BlueprintPure` 차이 분명히 하기. side-effect 가 있으면 절대 `BlueprintPure` 를 붙이지 않는다.
- `EditAnywhere` vs `EditDefaultsOnly` vs `EditInstanceOnly` 의미를 정확히 사용. 인스턴스 단위 편집이 의미 없는 클래스 기본값은 `EditDefaultsOnly`.
- `meta = (...)` 의 `ClampMin/UIMin`, `EditCondition`, `BlueprintProtected`, `ExposeOnSpawn` 등은 의도가 분명할 때만 사용한다.

### 11.1 UHT/리플렉션 추가 규칙

- `*.generated.h` 는 그 헤더의 **마지막** include. 그 위치를 옮기면 UHT 가 깨진다.
- 리플렉션 노출이 필요한 타입은 반드시 매크로와 접두사를 짝지어 사용한다.
  - `UCLASS()` ↔ `U`/`A`/`I` 접두사, `USTRUCT()` ↔ `F`, `UENUM()` ↔ `E`, `UINTERFACE()` ↔ `U`+`I` 쌍.
- **모듈 외부에서 참조될 클래스/구조체** 는 export 매크로를 붙인다. 본 프로젝트는 `LYRASKELETON_API`.
  ```cpp
  class LYRASKELETON_API ULsSampleComponent : public UActorComponent { ... };
  ```
- `private`/`protected` 멤버를 블루프린트에 노출할 때는 `meta = (AllowPrivateAccess = "true")` 를 명시. 단, 노출이 정말 필요한지 다시 검토 후 사용한다.
- 블루프린트 노출 함수는 다음 기준으로 선택한다.
  | 매크로 | 용도 |
  |---|---|
  | `BlueprintCallable` | C++ 구현, BP에서 호출 가능 (side-effect 허용) |
  | `BlueprintPure` | 위와 같으나 **side-effect 없음** + 입력 → 출력만 |
  | `BlueprintImplementableEvent` | C++ 선언만, BP에서 구현 |
  | `BlueprintNativeEvent` | C++ 기본 구현(`_Implementation`) + BP 가 override 가능 |
- 리플렉션 컨테이너는 UHT 가 지원하는 형태만 노출한다. `TArray<T>`, `TMap<K,V>`, `TSet<T>` 까지. **중첩 컨테이너(`TArray<TArray<T>>`), 템플릿 별칭, `TUniquePtr` 등은 `UPROPERTY` 에 직접 올릴 수 없다.** 필요한 경우 `USTRUCT` 로 한 단계 감싼다.
- enum 을 `UPROPERTY` 로 노출하려면 `UENUM(BlueprintType)` + 기반 타입을 명시한다. 보통 `enum class EFoo : uint8`.

---

## 12. switch / 제어 흐름

- 단일 문장이라도 `if`/`for`/`while` 본문은 **항상 중괄호**로 감싼다.
- `switch` 의 모든 의도된 fall-through 는 `[[fallthrough]];` 로 명시한다. 실수성 fall-through 는 컴파일 경고 대상.
- `switch` 에는 항상 `default:` 절을 둔다. 도달 불가 분기에는 `checkNoEntry();` 또는 `unimplemented();` 매크로 사용.

---

## 13. 어서션과 로깅

### 13.1 어서션 매크로 - 빌드별 동작 차이 주의

> **기준은 UE 기본 빌드 설정** (`USE_CHECKS_IN_SHIPPING=0`, `USE_ENSURES_IN_SHIPPING=1`). 별도 매크로를 켜면 동작이 달라진다.

| 매크로 | 의미 | Debug/Development/DebugGame/Test | Shipping (기본) |
|---|---|---|---|
| `check(Cond)` / `checkf(Cond, Fmt, ...)` | 절대 깨지면 안 되는 프로그래머 오류. 실패 시 즉시 크래시 | 평가 + 검증 | **컴파일아웃 (식 자체가 사라짐)** |
| `checkSlow(Cond)` | `check` 와 동일 의미지만 비용이 큰 검사용 | Debug/DebugGame 에서만 평가 | 컴파일아웃 |
| `verify(Cond)` / `verifyf(...)` | 식 평가는 항상 필요하지만 검증은 비-Shipping 에서만 | 평가 + 검증 | **식은 평가, 검증만 생략** |
| `ensure(Cond)` / `ensureMsgf(...)` | 비정상 상태를 보고하지만 계속 진행 가능 | 평가 + 보고 | 평가 + 보고 (기본 켜짐) |
| `checkNoEntry()` / `unimplemented()` | 도달 불가 분기 표시 | 도달 시 크래시 | 컴파일아웃 |

**중요한 함정**:

- `check()` 의 식에 **부작용을 넣지 않는다**. 예를 들어 `check(InitSubsystem())` 처럼 쓰면 Shipping 에서 `InitSubsystem()` 자체가 호출되지 않아 동작이 바뀐다. 부작용이 필요하면 `verify()` 를 쓴다.
  ```cpp
  // BAD: Shipping 에서 SaveProgress() 가 호출되지 않음
  check(SaveProgress());

  // OK
  const bool bSaved = SaveProgress();
  check(bSaved);

  // OK: 식 평가가 필요하면 verify
  verify(SaveProgress());
  ```
- 처리 가능한 비정상 상태(예: 외부 입력 검증, 레벨에 에셋이 없음)에는 `check` 가 아니라 `ensure` + 폴백 경로를 사용한다.

### 13.2 로깅

- 로그 카테고리는 모듈/서브시스템별로 선언한다. **`LogTemp` 는 일회성 디버그에만 사용하고 커밋 전 제거.**
  ```cpp
  DECLARE_LOG_CATEGORY_EXTERN(LogLsAnim, Log, All); // .h
  DEFINE_LOG_CATEGORY(LogLsAnim);                   // .cpp
  UE_LOG(LogLsAnim, Verbose, TEXT("Speed=%.2f"), Speed);
  ```

---

## 14. 들여쓰기·공백·줄바꿈

본 프로젝트는 [`.editorconfig`](../.editorconfig) 가 강제한다.

- 인코딩 **UTF-8**, 줄바꿈 **CRLF**, 들여쓰기 **공백 4칸**, 파일 끝 빈 줄 1개, 행 끝 공백 자동 제거.
- 중괄호는 **Allman 스타일**(여는 `{` 가 새 줄). UE 코드와 일관.
- 한 줄 길이 권장 100~120자 (강제는 아님). 긴 함수 시그니처는 매개변수 단위 줄바꿈.
- 주석은 가능하면 영문으로 쓰되, 학습용 설명/한국 팀 공유용에는 한글 주석 허용. 한글 깨짐 방지를 위해 **반드시 UTF-8 BOM 없이 저장** (`.editorconfig` 에 의해 자동 처리됨).
- **em dash (`—`, U+2014) 사용 금지** (코드 주석·문서·로그 메시지·`UE_LOG` 어디에도). ASCII 하이픈(`-`)으로 대체한다. en dash(`–`), ellipsis(`…`), 중간점(`·`), 스마트 따옴표(`""''`) 등 나머지 타이포그래피 문자는 자유. 이 규칙은 [`../CLAUDE.md`](../CLAUDE.md) 의 작성 규약과 동일하다.

> 들여쓰기·인코딩에 대해서는 UE 엔진 기본 컨벤션(탭)과 본 프로젝트 규칙(스페이스 4칸)이 다르므로 새 C++ 파일을 만들 때 주의할 것.

---

## 15. 주석과 문서화

- 공개 API(public 함수, `UFUNCTION`)는 **Doxygen 스타일** `/** ... */` 로 한 줄 요약 + 매개변수/반환 설명.
  ```cpp
  /**
   * 캐릭터의 현재 가속도로부터 입력 의도 방향을 계산한다.
   * @param InAcceleration   월드 공간 가속도 (cm/s^2).
   * @param OutLocalIntent   로컬 공간 입력 의도(정규화).
   * @return                 입력이 의미 있는 크기 이상이면 true.
   */
  bool ComputeInputIntent(const FVector& InAcceleration, FVector& OutLocalIntent) const;
  ```
- private 헬퍼나 자명한 코드에 주석을 달지 않는다. **WHY** 를 적되 **WHAT** 은 코드가 말하게 한다.

---

## 16. 모듈 경계와 `Build.cs` 의존성

엔진 크래시·UHT 오류·머지 충돌의 큰 비중이 모듈 의존성 정리 실패에서 나온다.

- **공개 API에서 노출되는 타입의 모듈** → `PublicDependencyModuleNames`. 즉, 본 모듈의 public 헤더가 `#include` 하는 다른 모듈 헤더는 모두 public dependency.
- **`.cpp` 또는 private 헤더에서만 쓰는 모듈** → `PrivateDependencyModuleNames`. 불필요하게 public 으로 올리면 의존자 전부에 전이된다.
- **순환 모듈 의존 금지.** 두 모듈이 서로를 필요로 하는 상황이라면 한 쪽을 분리하거나, 공통 인터페이스 모듈을 만들거나, 한 모듈의 의존을 함수 매개변수/델리게이트로 약결합화한다.
- 새 플러그인/모듈을 추가할 때는 **세 곳을 함께** 검토한다.
  1. `LyraSkeleton.uproject` 의 `Modules`/`Plugins`
  2. `Source/<Module>/<Module>.Build.cs`
  3. `Source/LyraSkeleton.Target.cs` / `LyraSkeletonEditor.Target.cs` 의 `ExtraModuleNames`
- `PublicIncludePaths` / `PrivateIncludePaths` 사용 기준:
  - **`Public/Private` 폴더 분리를 사용하는 모듈**: UBT 가 자동 처리. 추가 설정 불필요.
  - **flat 도메인 레이아웃 모듈** (본 프로젝트 처럼 `Source/<Module>/Domain/...` 구조): UBT 가 모듈 루트를 자동으로 include 경로에 추가하지 *않으므로*, 도메인 간 헤더 참조(`"Weapon/X.h"`)가 해석되지 않는다. **`PublicIncludePaths.AddRange(new string[] { ModuleDirectory });` 한 줄 명시 필수**. (Lyra 의 `LyraGame.Build.cs` 도 같은 방식)
  - 외부 모듈 디렉터리 노출에는 사용하지 않는다 - 공개 API 인터페이스는 `Public/` 헤더 분리 + `PublicDependencyModuleNames` 로 처리.

## 17. UObject 생성과 초기화 순서

생성자, 서브오브젝트, BeginPlay 의 책임을 명확히 분리한다.

- **생성자에서 가능한 일** - 기본값 설정, 컴포넌트의 `CreateDefaultSubobject`, `RootComponent` 지정, 클래스 기본값(CDO)에 보존되어야 하는 속성. **외부 객체 접근 금지** (`GetWorld()` 가 유효하지 않을 수 있고, GameInstance/PlayerController/PlayerState 등은 아직 없다).
- **`PostInitProperties` / `PostLoad`** - CDO/직렬화 직후 보정이 필요한 경우. 신중히.
- **컴포넌트의 `InitializeComponent`** - 같은 액터의 다른 컴포넌트 참조 캐싱.
- **`BeginPlay`** - 월드/다른 액터에 대한 의존이 있는 모든 초기화. PIE/실제 플레이 시작 시점.
- **`EndPlay`** - 외부 등록 해제, 델리게이트 언바인딩, 타이머 정리.
- **`UAnimInstance`** - `NativeInitializeAnimation` (1회), `NativeBeginPlay` (소유 폰의 BeginPlay 후), `NativeUpdateAnimation` (게임 스레드), `NativeThreadSafeUpdateAnimation` (워커 스레드, 스레드 안전 항목만).

## 18. 네트워크 / RPC / Replication

- **권한 분기**:
  - 서버 권한 검사: `HasAuthority()` (액터 컨텍스트), `GetLocalRole() == ROLE_Authority`.
  - 로컬 컨트롤 검사: `IsLocallyControlled()` (Pawn).
- **RPC 함수 이름과 specifier**:
  - 이름은 방향을 접두사로 표기: `Server_Fire`, `Client_NotifyHit`, `Multicast_PlayCue`.
  - `UFUNCTION(Server, Reliable, WithValidation)` 형태로 명시. 서버 RPC는 입력 검증을 위해 `WithValidation` + `_Validate()` 함께 작성.
  - `Reliable` 은 매 프레임 호출되는 RPC 에 사용하지 않는다 (트래픽 폭주). 위치/회전 같은 값은 `Unreliable` 또는 일반 `Replicated` 속성으로.
- **속성 복제**:
  - 단순 복제: `UPROPERTY(Replicated)` + `GetLifetimeReplicatedProps` 에 `DOREPLIFETIME(ThisClass, Prop)`.
  - 콜백 동반: `UPROPERTY(ReplicatedUsing = OnRep_Health)` + `void OnRep_Health(float OldHealth);`.
  - 조건부 복제: `DOREPLIFETIME_CONDITION(ThisClass, Prop, COND_OwnerOnly)` 등으로 대역폭 절약.
- **네트워크 안정성**:
  - 클라이언트 측에서 받은 모든 입력은 서버에서 다시 검증한다. 클라가 보낸 값을 그대로 신뢰하지 않는다.
  - `OnRep_X` 는 새 값으로 호출되는 시점이 클라이언트에 따라 다를 수 있으므로, 시각적 효과 외 게임플레이 결정을 여기서 내리지 않는다.

## 19. 스레드 안전성 / 비동기

- 기본 가정: **거의 모든 UObject API 는 게임 스레드 전용**. 별도 명시(스레드 안전, atomic, lockfree)가 없으면 다른 스레드에서 호출하지 않는다.
- 백그라운드 작업이 필요할 때:
  ```cpp
  AsyncTask(ENamedThreads::AnyBackgroundThreadNormalTask, [WeakThis = TWeakObjectPtr<ThisClass>(this)]()
  {
      // ... pure CPU work, NO UObject access ...
      AsyncTask(ENamedThreads::GameThread, [WeakThis]()
      {
          if (auto* Strong = WeakThis.Get()) { Strong->ApplyResult(...); }
      });
  });
  ```
- 람다·delegate 캡처에서 UObject 를 raw 로 잡지 말 것. `TWeakObjectPtr` 로 캡처 후 호출 시 `Get()` 으로 유효성 확인.
- **AnimInstance 의 `NativeThreadSafeUpdateAnimation`** 안에서는 게임 스레드 전용 API(`SpawnActor`, `SetTimer`, 다른 액터의 임의 함수 호출 등)를 절대 호출하지 않는다. 여기서는 `FAnimInstanceProxy` 또는 미리 캐싱된 값만 다룬다.
- 데이터 공유는 `std::atomic`(권장) 또는 `FCriticalSection`. 짧은 스코프에는 `FScopeLock`.

## 20. 애니메이션 C++ 전용 규칙

본 프로젝트의 핵심 학습 영역이므로 별도 규칙을 둔다.

- `UAnimInstance` 파생 클래스는 책임을 분리한다.
  - `NativeInitializeAnimation` - 한 번만 일어나는 캐시(소유 폰, 무브먼트 컴포넌트 캐스트).
  - `NativeUpdateAnimation` - **게임 스레드 전용** 작업 (가능한 한 비워둘 것).
  - `NativeThreadSafeUpdateAnimation` - Lyra 패턴의 본진. 모든 일반 갱신은 여기로.
- AnimGraph 가 매 틱 읽는 값은 C++ 에서 미리 계산해 다음 형태로 노출한다.
  ```cpp
  UPROPERTY(Transient, BlueprintReadOnly, Category = "Ls|Animation",
            meta = (AllowPrivateAccess = "true"))
  FVector LocalVelocity = FVector::ZeroVector;
  ```
- ABP 의 Event Graph 는 비워 둔다. 무거운 로직은 C++ + Threadsafe Update 로.
- 게임플레이 ↔ 애니메이션 사이는 **단방향**. 게임플레이가 ABP 의 변수를 직접 변경하지 않는다. 신호 전달은 GameplayTag, Native/Dynamic Delegate, Property Access 중 하나를 사용한다 (BP 구독 필요 시 Dynamic, C++ 내부 신호는 Native).
- `Anim Notify` 는 "**애니메이션 타이밍 신호**" 로만 쓴다. 데미지·발사·소비 같은 게임플레이 권한 판정은 Actor/Ability 측에서 수행하고, 노티는 그 트리거에 그친다 (네트워크 권위 분리 원칙).
- `Bone` 이름은 `FName` 으로 보관한다. `FString` 비교 금지.

## 21. Delegate / Event 바인딩

- **C++ 내부 이벤트** 는 native delegate 를 우선한다.
  - 단일: `DECLARE_DELEGATE_OneParam(...)`.
  - 멀티캐스트: `DECLARE_MULTICAST_DELEGATE_OneParam(...)`.
  - **블루프린트 노출이 필요할 때만** dynamic delegate (`DECLARE_DYNAMIC_MULTICAST_DELEGATE_*`).
- 바인딩 API 선택 기준:
  | API | 사용처 |
  |---|---|
  | `AddUObject(this, &ThisClass::Func)` | UObject 멤버 함수, 흔한 기본 |
  | `AddWeakLambda(this, [...])` | 람다인데 객체 수명을 약참조로 묶고 싶을 때 |
  | `AddRaw(this, &ThisClass::Func)` | 비-UObject. 수명 직접 관리 |
  | `AddDynamic(this, &ThisClass::Func)` / `AddUniqueDynamic` | dynamic delegate (BP-bindable) |
- **수명 종료 시 정리**: `EndPlay`/소멸 단계에서 `Remove`/`RemoveAll`/`Clear` 호출. 그렇지 않으면 dangling 호출로 크래시한다.
- 중복 바인딩이 우려될 때 dynamic 은 `AddUniqueDynamic`, native 는 명시적 해제 후 다시 `AddXxx`.

## 22. 테스트와 검증 (학습 프로젝트 최소선)

- 새 C++ 타입 추가 후 **Editor 타겟 빌드 1회** (`LyraSkeletonEditor` Development) - UHT 오류 차단.
- 헤더 변경(특히 `UCLASS`/`UPROPERTY` 시그니처) 후에는 **모듈 전체 빌드** 1회.
- 애니메이션 관련 변경(ABP·AnimInstance·노티) 은 PIE 1회 + 해당 ABP **에디터 컴파일 그린 라이트** 확인.
- 순수 로직(상태 전이·수학 계산 등)은 가능하면 함수로 분리해 Automation Test (`IMPLEMENT_SIMPLE_AUTOMATION_TEST`) 후보로 둔다.

## 23. 본 프로젝트 코드 리뷰 체크리스트

새 PR(또는 커밋) 을 올리기 전에 다음을 한 번 훑는다.

- [ ] 첫 줄 저작권 한 줄, 헤더는 `#pragma once`, 마지막 include 는 `*.generated.h`
- [ ] 타입 접두사(U/A/S/I/E/T/F)와 부울 `b` 접두사가 일관
- [ ] `UPROPERTY`/`UFUNCTION` 카테고리, `Out`/`In` 매개변수 접두사, UObject 포인터는 `TObjectPtr` + `UPROPERTY`
- [ ] 매개변수: 비싼 타입은 `const T&`, 싼 타입은 값
- [ ] 새 멤버 함수에 `const`, virtual 재정의에 `override`
- [ ] `auto` 사용처 정당함, 구조적 바인딩 없음
- [ ] `std::vector/map/move` 등 STL 컨테이너·이동 매크로를 UE 대체로 교체했는가
- [ ] 문자열 리터럴은 `TEXT()`, 정수형은 `int32` 계열
- [ ] `LogTemp` 가 남아 있지 않음, 어서션은 `check/ensure` 의 의미 차이를 정확히 선택
- [ ] 한 분기라도 중괄호 생략 없음, `switch` 는 `default:` 와 의도된 `[[fallthrough]];`
- [ ] 헤더에 불필요한 include 없이 전방 선언으로 대체 가능했는가
- [ ] 새 UObject 멤버의 생명주기에 맞는 형태(`TObjectPtr`/`TWeakObjectPtr`/`TSoftObjectPtr`)를 선택했는가
- [ ] UObject 생성에 `new`/`delete`/`TUniquePtr`/`TSharedPtr` 가 섞여 있지 않은가 (`NewObject`/`SpawnActor`/`CreateDefaultSubobject` 사용)
- [ ] Public 헤더가 노출하는 타입의 모듈이 `PublicDependencyModuleNames` 에 있는가
- [ ] `.cpp` 에서만 쓰는 모듈을 불필요하게 Public 의존으로 올리지 않았는가
- [ ] RPC/Replication 함수 이름과 권한 체크(`HasAuthority`/`IsLocallyControlled`)가 UE 관례와 일치하는가
- [ ] 백그라운드 스레드 또는 `NativeThreadSafeUpdateAnimation` 안에서 게임 스레드 전용 API 를 호출하지 않는가
- [ ] `check()` 의 식에 Shipping 에서 필요한 부작용이 들어 있지 않은가 (`verify()` 와 혼동 금지)
- [ ] `FName` / `FString` / `FText` 선택이 용도(식별자 / 가변 문자열 / 표시 텍스트)에 맞는가
- [ ] 델리게이트 바인딩이 `EndPlay`/소멸 시 해제되는가 (누수·dangling 방지)

---

## 24. 표준에서 의도적으로 벗어날 때

위 규칙에서 의도적으로 벗어나는 경우(예: 외부 라이브러리 래핑 헤더에서 STL 직접 노출), **해당 위치에 짧은 주석**으로 이유를 남기고, 더 큰 결정이라면 [`docs/`](.) 아래 별도 노트로 근거를 기록한다. "그냥 더 편해서" 는 사유가 되지 않는다.
