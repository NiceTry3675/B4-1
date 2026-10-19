# 요구사항 구현 설명서

이 문서는 [`requirement.md`](../requirement.md)의 요구사항을 **어떻게, 어디에서** 충족했는지 정리하고,
과제 목표("스스로 설명할 수 있어야 한다")에 답할 수 있도록 핵심 개념을 이 프로젝트 코드로 설명합니다.

- 1장: 전체 구조와 모든 기능에 공통으로 쓴 **상태 → 렌더링 패턴**
- 2장: 과제 목표 6가지에 대한 설명 (발표·코드 리뷰 대비)
- 3~5장: 요구사항 체크리스트 (4.1 ~ 4.10, 보너스, 개발 환경·제약 사항)
- 6장: 직접 확인해 보는 테스트 시나리오
- 7장: 설계 결정과 알려진 한계

---

## 1. 한눈에 보는 구조

### 1.1 파일별 역할

| 파일 | 역할 | 주요 함수 |
| --- | --- | --- |
| [`index.html`](../index.html) | 시맨틱 마크업. Hero / About / Skills / Projects / Contact / Footer | — |
| [`css/style.css`](../css/style.css) | 디자인 토큰(CSS 변수), 다크 테마, 레이아웃, 반응형 | — |
| [`js/config.js`](../js/config.js) | 설정값 한곳에 모음 (GitHub 아이디, 60px·300px·0.2 기준값 등) | `CONFIG` |
| [`js/utils.js`](../js/utils.js) | 공통 도우미 | `escapeHTML`, `prefersReducedMotion` |
| [`js/theme.js`](../js/theme.js) | 다크 모드 + localStorage + 시스템 테마 감지 | `initTheme` → `setTheme`, `render` |
| [`js/nav.js`](../js/nav.js) | 햄버거 메뉴, 부드러운 스크롤, 현재 섹션 표시 | `initNav` → `setMenuOpen`, `renderMenu`, `handleAnchorClick`, `renderActiveLink` |
| [`js/scroll.js`](../js/scroll.js) | 네비게이션 스타일 변경, 스크롤 탑 버튼 | `initScrollEffects` → `handleScroll`, `render` |
| [`js/reveal.js`](../js/reveal.js) | 스크롤 애니메이션 (Intersection Observer) | `revealObserver`, `observeReveal`, `initReveal` |
| [`js/typing.js`](../js/typing.js) | Hero 타이핑 효과 (보너스) | `initTyping` → `tick` |
| [`js/projects.js`](../js/projects.js) | GitHub API, 로딩/성공/에러/빈 상태, 언어 필터, 더 보기 | `initProjects` → `fetchRepos`, `setState`, `render` |
| [`js/form.js`](../js/form.js) | 문의 폼 유효성 검사, 전송 | `initContactForm` → `validators`, `setState`, `render`, `sendMessage` |
| [`js/main.js`](../js/main.js) | 진입점. 모든 `init*` 함수를 호출 | — |

### 1.2 스크립트를 여러 파일로 나눈 방법

```html
<script src="js/config.js" defer></script>
<script src="js/utils.js" defer></script>
<script src="js/theme.js" defer></script>
...
<script src="js/main.js" defer></script>
```

- `defer` 스크립트는 **HTML 파싱을 막지 않고** 내려받고, 파싱이 끝난 뒤 **적힌 순서대로** 실행됩니다.
  그래서 `<head>`에 두어도 `document.querySelector`로 요소를 바로 찾을 수 있고, `config.js`의 `CONFIG`를 뒤 파일에서 쓸 수 있습니다.
- 각 기능 파일은 `initTheme`, `initNav`처럼 **초기화 함수 하나만** 바깥에 내놓고, 나머지 변수·함수는 그 함수 안에 둡니다.
  (예외: 공통 값·도우미인 `CONFIG`, `escapeHTML`, `prefersReducedMotion`, 그리고 `projects.js`가 나중에 만든 카드에도 쓰도록 `reveal.js`가 함께 내놓는 `revealObserver`·`observeReveal`)
  파일끼리 이름이 겹치지 않고, 상태가 함수 안에 갇혀 다른 코드가 함부로 바꾸지 못합니다.
- `main.js`가 마지막에 모든 `init*`을 호출합니다. "무엇이 언제 시작되는지"를 한 파일에서 볼 수 있습니다.

> ES Module(`type="module"`)을 쓰면 `import`/`export`로 더 깔끔하게 나눌 수 있지만, 요구사항이 `defer` 연결을 명시하고 있고
> 파일을 더블클릭해서(`file://`) 열면 모듈이 동작하지 않아 일반 스크립트 + `defer`를 선택했습니다.

### 1.3 모든 기능에 공통으로 쓴 패턴: 이벤트 → 상태 변경 → 렌더링

상태를 가진 주요 인터랙션(테마, 메뉴, 스크롤, 프로젝트, 폼)은 모두 같은 모양으로 작성했습니다.

```js
// 1) 상태: 화면을 결정하는 데이터
let state = { status: 'idle', repos: [], filter: 'all' };

// 2) 상태 변경 함수: 상태를 바꾸면 반드시 다시 그린다
const setState = (changes) => {
  state = { ...state, ...changes };
  render();
};

// 3) 렌더링: 현재 상태만 보고 화면을 만든다
const render = () => { /* state → DOM */ };

// 4) 이벤트: 사용자의 행동 → 상태 변경
button.addEventListener('click', () => setState({ filter: 'Python' }));
```

- 이벤트 핸들러는 **화면을 직접 고치지 않고 상태만 바꿉니다.** 화면은 `render()`가 고칩니다.
  (예외: 포커스 이동처럼 상태로 표현하지 않는 일, 제출 후 입력값을 비우는 `form.reset()`, 그리고 상태가 단순한 `reveal.js`(`.visible` 추가)와 `typing.js`(`tick`이 글자를 바로 씀))
- 그래서 "화면이 왜 이렇게 보이지?"라는 질문의 답은 항상 "현재 `state`가 이렇기 때문"이 됩니다.
- React의 `const [state, setState] = useState()`와 같은 구조입니다. React는 `render()`를 직접 부르지 않아도 상태가 바뀌면 자동으로 다시 그려 주는 것이 차이입니다.

---

## 2. 과제 목표별 설명

### 2.1 시맨틱 태그를 왜 쓰고, 어떤 기준으로 구조를 설계했나

**왜 쓰나**

- **의미 전달**: `<div>`는 "덩어리"라는 뜻밖에 없지만, `<nav>`는 "이동 메뉴", `<article>`은 "독립적인 콘텐츠 한 개"라는 의미를 가집니다.
- **접근성**: 스크린 리더는 `<header>`, `<nav>`, `<main>`, `<footer>`를 랜드마크로 인식해 "본문으로 이동", "메뉴로 이동" 같은 탐색을 제공합니다.
- **검색 엔진(SEO)**: 검색 엔진이 페이지에서 무엇이 핵심 내용(`<main>`)이고 무엇이 제목(`<h1>`~`<h3>`)인지 이해하기 쉽습니다.
- **유지보수**: 클래스 이름을 읽지 않아도 태그만으로 구조가 보입니다.

**이 프로젝트의 설계 기준**

```text
<body>
├── <a class="skip-link">          본문 바로가기 (키보드 사용자용)
├── <header>                       사이트 전체에 반복되는 상단 영역
│   └── <nav aria-label="주요 메뉴">  섹션 이동 링크 = 내비게이션
├── <main id="main">               페이지의 핵심 콘텐츠 (페이지당 1개)
│   ├── <section id="hero">        제목(h1)을 가진 주제 덩어리
│   ├── <section id="about">       └── <figure> 프로필 사진
│   ├── <section id="skills">      └── <article> 기술 분류 카드 (각각 독립적으로 의미가 있음)
│   ├── <section id="projects">    └── <article> 저장소 카드 (JS로 생성)
│   └── <section id="contact">     └── <form> + <label for>
└── <footer>                       저작권, 소셜 링크
```

- **`<section>`**: 제목(`h2`)을 가진 주제 단위. 각 섹션은 `aria-labelledby`로 자신의 제목과 연결했습니다.
- **`<article>`**: 떼어서 다른 곳에 옮겨도 의미가 통하는 단위. 프로젝트 카드 하나, 기술 분류 카드 하나가 그렇습니다. 카드 안의 메타 정보는 `<footer>`, 수정일은 `<time datetime>`으로 표시했습니다.
- **제목 계층**: 페이지에 `h1`은 하나(Hero), 섹션 제목은 `h2`, 카드 제목은 `h3`입니다. 순서를 건너뛰지 않습니다.
- **목록**: 메뉴, 기술 태그, 소셜 링크처럼 "여러 개가 나열된 것"은 `<ul>/<li>`로 만들었습니다.

### 2.2 Flexbox와 Grid의 차이, 언제 무엇을 쓰나

| | Flexbox | Grid |
| --- | --- | --- |
| 차원 | **1차원** (한 줄: 가로 또는 세로) | **2차원** (행과 열을 동시에) |
| 기준 | **콘텐츠**의 크기에서 출발해 남는 공간을 나눔 | **틀(트랙)**을 먼저 정하고 아이템을 배치 |
| 잘 맞는 곳 | 메뉴 바, 버튼 묶음, 아이콘+텍스트 정렬 | 카드 목록, 사진 갤러리, 페이지 레이아웃 |

**이 프로젝트에서의 선택**

- **네비게이션 → Flexbox** (`.nav`): 로고와 메뉴는 "한 줄에 늘어선 요소"이고, 양 끝으로 벌리기만 하면 됩니다.
  ```css
  .nav { display: flex; align-items: center; justify-content: space-between; }
  ```
  태블릿 이상에서는 메뉴에 `margin-left: auto`를 줘서 메뉴와 테마 버튼을 오른쪽으로 밀었습니다.
- **Projects 카드 → Grid** (`.projects__grid`): 카드가 행과 열로 정렬되어야 하고, 화면 폭에 따라 열 개수가 바뀌어야 합니다.
  ```css
  .projects__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  }
  ```
  - `minmax(280px, 1fr)`: 카드는 최소 280px, 남는 공간은 똑같이 나눠 가짐
  - `auto-fit`: 들어갈 수 있는 만큼 열을 자동으로 만듦 → **미디어 쿼리 없이** 1열(모바일) → 2열(태블릿) → 3열(데스크톱)
  - `min(100%, 280px)`: 화면이 280px보다 좁은 기기에서도 카드가 화면 밖으로 넘치지 않게 함
- **Skills → Grid** (`.skills__grid`): 1열 → 2열(768px) → 3열(1024px)로 미디어 쿼리에서 명시적으로 바꿨습니다.
- **Contact (데스크톱) → Grid** (`grid-template-columns: 2fr 3fr`): 소개 글과 폼을 2:3 비율로 배치.
- **카드 내부, 버튼 묶음, 태그 목록 → Flexbox**: `flex-wrap: wrap`으로 넘치면 다음 줄로.

> 기준 한 줄 요약: **"한 방향으로 늘어놓기"는 Flexbox, "격자에 맞춰 배치하기"는 Grid.**

### 2.3 `querySelector`로 DOM을 선택하고 `addEventListener`로 이벤트를 연결하는 흐름

```js
// 1) 선택: CSS 선택자 문법으로 요소를 찾는다
const hamburger = document.querySelector('.nav__hamburger');   // 첫 번째 1개
const anchorLinks = document.querySelectorAll('a[href^="#"]'); // 전부 (NodeList)

// 2) 핸들러: 이벤트 객체로 정보를 얻고, 필요하면 기본 동작을 막는다
//    (const 함수는 선언보다 먼저 쓸 수 없으므로 연결보다 위에 정의한다)
const handleAnchorClick = (event) => {
  const { hash } = event.currentTarget;  // 클릭된 링크의 '#about'
  event.preventDefault();                // 순간이동(기본 동작) 막기
  document.querySelector(hash).scrollIntoView({ behavior: 'smooth' });
};

// 3) 연결: "이 요소에서 이 이벤트가 생기면 이 함수를 실행해라"
hamburger.addEventListener('click', () => setMenuOpen(!isMenuOpen));
anchorLinks.forEach((link) => link.addEventListener('click', handleAnchorClick));
```

- `onclick="..."` 속성 대신 `addEventListener`를 쓰는 이유: HTML(구조)과 JS(동작)가 분리되고, 한 요소에 리스너를 여러 개 달 수 있고, `{ passive: true }` 같은 옵션을 줄 수 있습니다.
- **이벤트 위임**: Projects의 "다시 시도"·필터 버튼은 `render()` 때마다 `innerHTML`로 새로 만들어집니다.
  새 버튼마다 리스너를 다는 대신, **변하지 않는 부모**에 리스너를 한 번만 달고 `event.target.closest('.filter-btn')`로 어떤 버튼인지 확인합니다 (`projects.js`, `form.js`의 `input`/`focusout` 처리).
- 이 프로젝트에서 다루는 이벤트: `click`, `submit`, `scroll`, `input`, `focusout`, `keydown`, 그리고 `matchMedia`의 `change`.

### 2.4 화살표 함수, 구조분해 할당, `map`/`filter`가 왜 필요하고 어떻게 썼나

**화살표 함수** — 짧은 콜백을 간결하게 쓰고, `this`를 새로 만들지 않습니다.
```js
const getSystemTheme = () => (systemDarkQuery.matches ? 'dark' : 'light'); // theme.js
anchorLinks.forEach((link) => link.addEventListener('click', handleAnchorClick)); // nav.js
```

**구조분해 할당** — 객체·배열에서 필요한 값만 이름 붙여 꺼냅니다. API 응답처럼 속성이 많은 객체에서 특히 유용합니다.
```js
// projects.js — API의 긴 속성 이름을 짧은 이름으로 바꾸면서 꺼내기, 기본값까지
const toRepo = ({ name, html_url: url, stargazers_count: stars, topics = [] }) => ({ name, url, stars, topics });

// scroll.js — 설정 객체에서 꺼내기
const { navScrollThreshold, scrollTopThreshold } = CONFIG;

// nav.js — 이벤트 객체에서 바로 꺼내기
document.addEventListener('keydown', ({ key }) => { if (key === 'Escape') ... });

// projects.js — 배열 구조분해 ([언어, 개수] 쌍)
const createFilterButton = ([language, count]) => `...`;
```

**배열 메서드** — "반복문으로 무엇을 하는지"가 메서드 이름에 드러납니다. 원본 배열을 바꾸지 않고 새 배열을 돌려줍니다.

| 메서드 | 쓰임 | 위치 |
| --- | --- | --- |
| `map` | GitHub 데이터 → 화면용 객체 (`data.map(toRepo)`), 저장소 배열 → 카드 HTML (`visibleRepos.map(createCard).join('')`) | `projects.js` `fetchRepos`, `render` |
| `filter` | 포크 저장소 제외 (`({ fork }) => !fork`), 선택한 언어만 표시 | `projects.js` `fetchRepos`, `getFilteredRepos` |
| `forEach` | 메뉴 링크·`.reveal` 요소·폼 필드 순회 | `nav.js`, `reveal.js`, `form.js` |
| `reduce` | 언어별 저장소 개수 세기 | `projects.js` `getLanguageCounts` |
| `find` | 첫 번째로 잘못된 폼 필드 찾기 | `form.js` 제출 처리 |

**템플릿 리터럴** — 백틱(`` ` ``) 안에 `${}`로 값을 넣어 HTML을 만듭니다 (`createCard`, `createStatusTemplate`, `createFilterButton`).
외부 데이터(저장소 이름·설명)는 반드시 `escapeHTML()`을 거쳐 넣습니다 → 7.3 참고.

### 2.5 `fetch` + `async`/`await`로 데이터를 가져오고 상태를 UI로 표현한 방법

```js
// projects.js — fetchRepos (요약)
const fetchRepos = async () => {
  setState({ status: 'loading' });                    // ① 로딩 상태 → 스피너
  try {
    const response = await fetch(API_URL);            // ② 응답이 올 때까지 기다림
    if (!response.ok) throw createApiError(response); // ③ 404·403도 직접 에러로 처리
    const data = await response.json();
    const repos = data.filter(({ fork }) => !fork).map(toRepo);
    setState({ status: repos.length > 0 ? 'success' : 'empty', repos }); // ④ 성공 or 빈 상태
  } catch (error) {
    setState({ status: 'error', errorMessage: getErrorMessage(error) });  // ⑤ 에러 상태
  }
};
```

- `async` 함수 안의 `await`는 Promise가 끝날 때까지 **그 함수만** 멈추고, 브라우저(스크롤·클릭)는 계속 동작합니다.
- **주의할 점**: `fetch`는 네트워크가 끊겼을 때만 예외를 던지고, **404·403 응답은 정상 응답으로 취급**합니다. 그래서 `response.ok`를 확인해 직접 `throw`했습니다.
- `status` 하나로 화면을 결정합니다 (`createStatusTemplate`의 `switch`).

| 상태 | 언제 | 화면 |
| --- | --- | --- |
| `loading` | 요청 시작 직후 | 스피너 + "프로젝트를 불러오는 중..." (`aria-busy="true"`) |
| `success` | 저장소가 1개 이상 | 언어 필터 + 카드 목록 + "더 보기" |
| `empty` | 응답은 성공했지만 표시할 저장소가 0개 (필터 결과 0개 포함) | "표시할 프로젝트가 없습니다." |
| `error` | 네트워크 오류, 404, 403(레이트 리밋), 5xx | "프로젝트를 불러올 수 없습니다." + 원인 + **다시 시도** 버튼 |

- **레이트 리밋(403)**: 응답 헤더 `X-RateLimit-Remaining: 0`이면 한도 초과로 판단하고, `X-RateLimit-Reset`(초 단위 시각)을 읽어 "오후 01:42 이후에 다시 시도"처럼 보여줍니다. 429도 같은 메시지로 처리합니다.
- **다시 시도**: 버튼 클릭 → `fetchRepos()`를 다시 호출 → 다시 `loading`부터 시작. 요청 중에는 중복 호출을 막습니다.
- 상태 메시지 영역에 `aria-live="polite"`를 두어 스크린 리더 사용자에게도 "불러오는 중", "불러올 수 없습니다"가 전달됩니다.

### 2.6 이벤트 → 상태 변경 → DOM 업데이트 (React 상태-렌더링의 기초)

이 프로젝트에는 아래 **7가지** 흐름이 있습니다 (요구사항: 3가지 이상).

| # | 이벤트 | 상태 변경 | 화면 업데이트 | 코드 |
| --- | --- | --- | --- | --- |
| 1 | 다크 모드 버튼 `click` | `theme: 'light' ↔ 'dark'` (+ localStorage 저장) | `<html data-theme>` → CSS 변수 전체 교체 | `theme.js` `setTheme` → `render` |
| 2 | 페이지 로드 / 다시 시도 `click` | `status: loading → success / empty / error` | 스피너 / 카드 / 빈 상태 / 에러 메시지 | `projects.js` `fetchRepos` → `setState` → `render` |
| 3 | 폼 `input`·`focusout`·`submit` | `errors`, `touched`, `status` | 에러 메시지 표시/숨김, 입력칸 테두리, 성공 메시지 | `form.js` `setState` → `render` |
| 4 | 언어 필터 `click` | `filter` | 해당 언어 카드만 표시, 버튼 강조 | `projects.js` |
| 5 | 햄버거 `click` / Esc / 바깥 클릭 / 포커스가 헤더 밖으로 | `isMenuOpen` | `.active` 클래스, `aria-expanded` | `nav.js` `setMenuOpen` → `renderMenu` |
| 6 | 창 `scroll` | `isScrolled`, `showScrollTop` | 헤더 `.scrolled`, 스크롤 탑 버튼 `.visible` | `scroll.js` `handleScroll` → `render` |
| 7 | 더 보기 `click` | `visibleCount` | 카드 6개씩 추가 | `projects.js` |

**예시로 따라가 보기 — 다크 모드**

```text
[사용자] 달 아이콘 클릭
   │  click 이벤트
   ▼
[이벤트 핸들러] setTheme(theme === 'dark' ? 'light' : 'dark')
   │  상태 변경: theme = 'dark', localStorage.setItem('theme', 'dark')
   ▼
[render] root.dataset.theme = 'dark'  →  <html data-theme="dark">
   │       버튼 aria-pressed="true" (버튼 이름 "다크 모드"는 고정)
   ▼
[CSS] [data-theme="dark"] { --color-bg: #0f172a; ... }
       → var(--color-bg)를 쓰는 모든 요소의 색이 한 번에 바뀜
```

새로고침하면 `initTheme`이 `localStorage.getItem('theme')`로 상태를 **복원**한 뒤 `render()`를 한 번 호출합니다.
"상태를 저장해 두면 화면은 언제든 다시 만들 수 있다" — 이것이 React에서 상태를 다루는 방식의 핵심입니다.

**React로 옮긴다면**

| 이 프로젝트 | React |
| --- | --- |
| `let state = {...}` + `setState()` | `const [state, setState] = useState(...)` |
| `render()`에서 `innerHTML`/`classList`로 DOM 수정 | 컴포넌트가 JSX를 반환하면 React가 DOM 수정 |
| `addEventListener('click', ...)` | `<button onClick={...}>` |
| `createCard(repo)` 템플릿 함수 | `<ProjectCard repo={repo} />` 컴포넌트 |
| 이벤트 위임 (`closest`) | React가 내부적으로 위임 처리 |
| 페이지 로드 시 `fetchRepos()` | `useEffect(() => { fetchRepos() }, [])` |

---

## 3. 기능 요구사항 체크리스트 (4장)

### 4.1 프로젝트 기본 구성

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| `index.html`, `css/`, `js/`, `images/` 역할 분리 | ✅ | 폴더 구조는 [README](../README.md#폴더-구조) 참고 |
| 외부 스타일시트·JS를 HTML에 연결 | ✅ | `<link rel="stylesheet" href="css/style.css">`, `<script src="js/..." defer>` |
| VS Code + Live Server 개발 환경 | ⚠️ 직접 설치 | README "실행 방법"에 설치·실행 방법 정리. Live Server 기본 포트(5500)로 동작 확인 |

### 4.2 HTML 구조 (시맨틱 마크업)

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| `header`, `nav`, `main`, `section`, `article`, `footer` 사용 | ✅ | 2.1의 구조도 참고. `article`은 Skills 카드(정적)와 Projects 카드(동적)에 사용 |
| Hero: 인사말, CTA 버튼 | ✅ | `#hero` — "안녕하세요!", `h1`, 타이핑 문구, "프로젝트 보기"/"연락하기" 버튼 |
| About: 자기소개, 프로필 이미지 | ✅ | `#about` — `<figure><img alt>` + 소개 문단 + 사실 목록 |
| Skills: 기술 스택 목록 | ✅ | `#skills` — 분야별 `article` 3개, `ul > li.skill-tag` |
| Projects: GitHub API 연동 카드 | ✅ | `#projects` — `projects.js`가 카드 생성 |
| Contact: 문의 폼 | ✅ | `#contact` — 이름/이메일/메시지 폼 |
| Footer: 저작권, 소셜 링크 | ✅ | `©` + 연도(JS로 현재 연도) + GitHub/LinkedIn/이메일 |
| 네비게이션에 섹션 앵커 링크 | ✅ | `href="#about"`, `#skills`, `#projects`, `#contact` |
| 모든 이미지에 의미 있는 `alt` | ✅ | 프로필: `alt="임준현 프로필 이미지"`. 장식용 SVG 아이콘은 `aria-hidden="true"`로 숨기고, 아이콘만 있는 링크·버튼에는 `aria-label`("GitHub (새 창)", "맨 위로 이동" 등) |
| 폼 `<label for>` ↔ `id` 연결 | ✅ | `for="name"`↔`id="name"`, `email`, `message`. 에러 문구는 `aria-describedby`로 입력칸과 연결 |

### 4.3 CSS 스타일링

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| 외부 스타일시트 `css/style.css` | ✅ | 인라인 `<style>`/`style=""` 없음 |
| `:root` CSS 변수로 색상·폰트·간격 | ✅ | `--color-*`, `--font-*`·`--fs-*`·`--fw-*`, `--space-*`, `--radius-*`, `--shadow-*` |
| 다크 모드 변수 `[data-theme="dark"]` | ✅ | 같은 이름의 변수를 어두운 값으로 재정의. `color-scheme: dark`로 스크롤바·폼 기본색도 어둡게 |
| 네비게이션 Flexbox (로고 왼쪽, 메뉴 오른쪽) | ✅ | `.nav { display: flex; justify-content: space-between }` |
| Projects 카드 Grid (`auto-fit`, `minmax`) | ✅ | `.projects__grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)) }` |
| 모바일 퍼스트 | ✅ | 기본 스타일 = 모바일, `@media (min-width: ...)`로만 확장 (`max-width` 쿼리 없음) |
| 브레이크포인트 768px, 1024px | ✅ | 파일 하단 "반응형: 태블릿", "반응형: 데스크톱" 블록 |
| 모바일에서 메뉴 숨김 + 햄버거 표시 | ✅ | 기본: `.nav__menu { visibility: hidden }`, 햄버거 표시 → 768px 이상: 메뉴 가로 표시, `.nav__hamburger { display: none }` |
| 버튼·카드 hover + `transition` | ✅ | `.btn--primary:hover`·`.btn--outline:hover`, `.project-card:hover`, `.skill-card:hover` (살짝 떠오름 + 그림자), `.filter-btn:hover`, 소셜 링크 등. 스크롤 애니메이션은 `transition`이 아닌 `@keyframes`로 만들어 카드의 hover 전환 효과를 덮어쓰지 않게 함 |
| 카드 `box-shadow` | ✅ | `.project-card { box-shadow: var(--shadow-md) }`, hover 시 `--shadow-lg` |

### 4.4 JavaScript 기초

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| `defer`로 연결 | ✅ | 10개 스크립트 모두 `defer` |
| `var` 금지, `const`/`let`만 | ✅ | `let`은 바뀌는 상태(`state`, `theme`, `isMenuOpen` 등)에만, 나머지는 `const` |
| `onclick` 금지, `addEventListener` | ✅ | HTML에 `on*` 속성 없음 |
| `querySelector`, `querySelectorAll` | ✅ | 예: `nav.js`의 `querySelectorAll('a[href^="#"]:not(.skip-link)')` |
| `textContent`, `innerHTML` | ✅ | `textContent`: 폼 에러·성공 메시지, 타이핑, 더 보기 버튼, 연도. `innerHTML`: Projects 카드·필터·상태 메시지 |
| `classList.add` / `remove` / `toggle` | ✅ | `add`·`remove`: `scroll.js`의 헤더 `.scrolled` (일부러 두 메서드로 작성), `reveal.js`의 `.visible`, `main.js`의 `.js`. `toggle`: 햄버거 `.active`, 폼 `.invalid`/`.valid` 등 |
| `click`, `submit`, `scroll`, `input` 이벤트 | ✅ | `click`: 거의 모든 버튼. `submit`·`input`: `form.js`. `scroll`: `scroll.js` |
| `event.preventDefault()` | ✅ | 앵커 클릭(순간이동 대신 부드러운 스크롤), 폼 제출(새로고침 방지) |

### 4.5 인터랙션

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| 1. 햄버거 메뉴 토글 (`classList.toggle('active')`) | ✅ | `nav.js` `renderMenu`: `menu.classList.toggle('active', isMenuOpen)`. 버튼은 X 모양으로 바뀌고 `aria-expanded`도 갱신. 추가로 Esc·바깥 클릭·링크 클릭·포커스가 헤더 밖으로 나갈 때·태블릿 크기로 늘릴 때 닫힘. 열면 첫 메뉴 링크로 포커스 이동 |
| 2. 부드러운 스크롤 | ✅ | `nav.js` `handleAnchorClick`: `preventDefault()` 후 `scrollIntoView({ behavior: 'smooth' })`. 고정 헤더에 가리지 않도록 CSS `scroll-padding-top: var(--header-height)`. 주소창 해시도 `history.pushState`로 갱신. 키보드 포커스도 이동한 섹션으로 옮김 |
| 3. 스크롤 탑 버튼 (300px) | ✅ | `scroll.js`: `scrollY >= 300`이면 `.visible`. 클릭 시 `window.scrollTo({ top: 0, behavior: 'smooth' })` + 포커스를 로고로 이동 |
| 4. 네비게이션 스타일 변경 (60px) | ✅ | `scroll.js`: `scrollY >= 60`이면 헤더에 `.scrolled` → 반투명 배경 + 그림자 + blur |
| 5. 다크 모드 + localStorage | ✅ | `theme.js` — 2.6 다이어그램 참고 |
| 6. 스크롤 애니메이션 (threshold 0.2 이상) | ✅ | `reveal.js`: `new IntersectionObserver(callback, { threshold: 0.2 })`. 보이면 `.visible` 추가 후 `unobserve` (한 번만 실행) |

기준값(60px, 300px, 0.2)은 모두 [`js/config.js`](../js/config.js)에 있고 README "기준값" 표에 명시했습니다.

### 4.6 폼 UX

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| 이름·이메일·메시지 폼 | ✅ | `#contact form.contact-form` |
| 필수값 검증 (빈 필드 제출 불가) | ✅ | `validators`: 공백만 입력해도(`trim()`) 빈 값으로 처리. 에러가 있으면 전송하지 않고 첫 번째 잘못된 칸으로 포커스 이동 |
| 이메일 형식 검증 | ✅ | `EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` |
| 에러 메시지를 입력 필드 근처에 표시 | ✅ | 각 입력칸 바로 아래 `<p class="form-field__error" id="...-error">` + 빨간 테두리 |
| `preventDefault()` + 성공 메시지 | ✅ | 제출 시 새로고침을 막고, 전송이 끝나면 "○○님, 메시지가 접수되었습니다!" 표시 후 폼 초기화 |

**에러를 보여주는 시점** (UX 설계)

- 입력 중(`input`)에는 매번 다시 검사해 상태(`errors`)를 갱신하지만, **화면에 보여주는 것은 그 칸을 한 번 벗어난 뒤(`touched`)부터**입니다.
  이메일을 쓰는 도중 첫 글자부터 "형식이 틀렸습니다"가 뜨는 불편을 막기 위해서입니다.
- 한 번 에러가 보인 칸은 입력할 때마다 즉시 다시 검사되어, 고치는 순간 에러가 사라지고 초록 테두리가 됩니다.
- 제출 버튼을 누르면 모든 칸을 `touched`로 바꿔 한꺼번에 에러를 보여줍니다.
- 브라우저 기본 말풍선 대신 직접 만든 UI를 쓰려고 `<form novalidate>`를 지정했습니다 (`required`는 의미 전달용으로 유지).

### 4.7 ES6+ 문법 & 배열 메서드

2.4 참고. 화살표 함수, 템플릿 리터럴(카드 HTML 생성), 구조분해 할당(객체·배열·함수 매개변수), `map`/`filter`/`forEach` 모두 사용. 그 밖에 스프레드(`{ ...state, ...changes }`), 기본 매개변수(`{ persist = true } = {}`), 옵셔널 체이닝(`?.`), 널 병합(`??`), `Object.entries`/`Object.fromEntries`, `reduce`로 개수 세기 등을 썼습니다.

### 4.8 비동기 처리 & API 연동

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| `fetch` + `async`/`await` | ✅ | `projects.js` `fetchRepos` |
| 엔드포인트 `/users/{아이디}/repos` | ✅ | `https://api.github.com/users/NiceTry3675/repos?sort=updated&per_page=100` (최근 업데이트순, 최대 100개) |
| 로딩 UI | ✅ | 스피너 + "프로젝트를 불러오는 중..." |
| 성공 UI | ✅ | 카드 목록 (이름·설명·토픽·언어·스타·포크·수정일·데모 링크) |
| 에러 UI + 재시도 버튼 | ✅ | "프로젝트를 불러올 수 없습니다." + 원인 + "다시 시도" |
| 빈 상태 UI | ✅ | "표시할 프로젝트가 없습니다." |
| `try`/`catch` | ✅ | `fetchRepos`, `form.js` 제출, `theme.js` localStorage 접근 |
| 403 레이트 리밋 시 에러 UI | ✅ | 2.5 참고 |

### 4.9 상태 관리 패턴

2.6의 표 참고 — 요구사항 표의 4가지(다크 모드, API, 폼, 필터)를 모두 구현했고, 햄버거 메뉴·스크롤·더 보기까지 같은 패턴으로 작성했습니다.

### 4.10 배포

| 요구사항 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| GitHub Pages 배포 | ⏳ push 후 | 저장소 Settings → Pages → `main` / `(root)`. 모든 경로가 상대 경로라 `/B4-1/` 하위 경로에서도 동작. `.nojekyll` 포함 |
| 배포 URL에서 모든 기능 동작 | ⏳ 배포 후 확인 | 로컬 HTTP 서버에서 반응형·인터랙션·API·폼 검증을 확인함 (6장) |
| README: 설명, 사용 기술, 배포 URL, 스크린샷 | ✅ | [README.md](../README.md) |

---

## 4. 보너스 과제 (5장)

| 보너스 | 충족 | 방법 / 위치 |
| --- | --- | --- |
| 프로젝트 언어별 필터링 (`array.filter()`) | ✅ | `getLanguageCounts`(`reduce`)로 실제 데이터에 있는 언어만 버튼으로 만들고(개수 많은 순), `getFilteredRepos`에서 `repos.filter(({ language }) => language === filter)`. 언어가 없는 저장소는 "기타". 버튼은 `aria-pressed`로 선택 상태 표시 |
| 타이핑 효과 | ✅ | `typing.js`: `data-words` 속성의 문구를 한 글자씩 쓰고 지움. 상태(`wordIndex`, `charCount`, `isDeleting`) + `setTimeout`. 스크린 리더에는 전체 문구를 한 번에 제공하고 글자 변화는 `aria-hidden`. 동작 줄이기 설정 시 첫 문구만 고정 |
| 폼 실제 전송 (Formspree) | ✅ (설정 필요) | `sendMessage`: `CONFIG.formspreeId`가 있으면 `fetch`로 `POST https://formspree.io/f/{id}`. 비어 있으면 **데모 모드** — 실제로 보내지 않고, 성공 메시지에 "데모 모드라 실제 이메일은 발송되지 않습니다"라고 솔직하게 표시 |
| 시스템 다크 모드 감지 (`prefers-color-scheme`) | ✅ | `theme.js`: 저장된 설정이 없으면 `matchMedia('(prefers-color-scheme: dark)')`를 따르고, OS 설정이 바뀌면 실시간 반영. 사용자가 버튼으로 고른 뒤에는 저장된 값이 우선 |

**추가로 넣은 것**: 더 보기(6개씩), 현재 섹션 메뉴 강조, 본문 바로가기 링크, 키보드 포커스 표시(`:focus-visible`)와 포커스 관리(7.4), 글자 명도 대비 4.5:1 이상(라이트·다크), `prefers-reduced-motion` 대응, 외부 데이터 XSS 방지.

---

## 5. 개발 환경 & 제약 사항 (6~7장)

| 제약 | 충족 | 확인 방법 |
| --- | --- | --- |
| React·Vue·jQuery·Bootstrap·Tailwind 등 금지 | ✅ | 외부 리소스는 Google Fonts뿐. 아이콘은 인라인 SVG |
| `var` 대신 `const`/`let` | ✅ | `grep -nw "var" js/*.js` → 결과 없음 |
| `onclick` 대신 `addEventListener` | ✅ | `grep -n "onclick" index.html js/*.js` → 결과 없음 |
| 인라인 스타일(`style="..."`) 금지 | ✅ | `grep -n "style=" index.html js/*.js` → 결과 없음. JS에서도 `element.style`을 쓰지 않고 **클래스**로만 스타일을 바꿈. 언어 색상 점도 인라인 색 대신 `[data-lang="Python"] .lang-dot` 선택자로 처리 |
| 최신 Chrome에서 동작 | ✅ | Chrome으로 데스크톱(1440px)·태블릿(768px)·모바일(375/390px), 라이트·다크 확인 |
| 제출물: 저장소 URL, 배포 URL, 데스크톱/모바일/다크모드 스크린샷 | ✅ / ⏳ | 저장소·배포 URL은 README 상단, 스크린샷은 `images/screenshots/` |
| GitHub API 레이트 리밋 대응 | ✅ | 403 + `X-RateLimit-Remaining: 0` → 에러 UI + 재시도 가능 시각 표시 |

---

## 6. 직접 확인해 보는 테스트 시나리오

| # | 해볼 것 | 기대 결과 |
| --- | --- | --- |
| 1 | 창 너비를 375 → 768 → 1024 → 1440px로 바꾸기 (DevTools 기기 모드) | 375: 햄버거, 카드 1열 / 768: 메뉴 가로, 카드 2열 / 1024+: 카드 3열, Contact 2단 |
| 2 | 모바일에서 햄버거 클릭 → 다시 클릭 | 메뉴 열림(X 아이콘) → 닫힘 |
| 3 | 메뉴 열고 Esc / 바깥 클릭 / 메뉴 링크 클릭 | 메뉴 닫힘. 링크는 해당 섹션으로 부드럽게 이동 |
| 4 | 천천히 스크롤 | 60px부터 헤더 배경, 300px부터 오른쪽 아래 ↑ 버튼, 섹션이 아래에서 떠오르며 나타남, 메뉴에 현재 섹션 강조 |
| 5 | ↑ 버튼 클릭 | 맨 위로 부드럽게 이동 |
| 6 | 다크 모드 버튼 클릭 → 새로고침 | 다크 유지. DevTools → Application → Local Storage에 `theme: dark` |
| 7 | localStorage의 `theme` 삭제 → OS 다크 모드 켜고 끄기 | 사이트가 OS 설정을 따라감 |
| 8 | Projects의 언어 필터 클릭, 더 보기 클릭 | 해당 언어만 표시 / 6개씩 추가, 요약 문구 갱신 |
| 9 | Network 탭에서 `repos?...` 요청 우클릭 → Block request URL → 새로고침 | 에러 메시지 + 다시 시도 → 차단 해제 후 다시 시도하면 카드 표시 (Offline 모드는 페이지 자체가 안 열려서 쓰지 않음) |
| 10 | 폼을 비운 채 보내기 | 세 칸 모두 에러, 첫 칸으로 포커스 |
| 11 | 이메일에 `hong@` 입력 후 다음 칸으로 → `hong@test.com`으로 고치기 | 형식 에러 표시 → 고치는 순간 사라지고 초록 테두리 |
| 12 | 올바르게 채워 보내기 | "보내는 중..." → 성공 메시지, 폼 초기화 |
| 13 | Tab 키로만 사이트 탐색 | 첫 Tab에 "본문으로 건너뛰기", 모든 버튼·링크에 포커스 테두리 |

---

## 7. 설계 결정과 알려진 한계

### 7.1 테마 깜빡임 (FOUC)
CSS의 기본값(`:root`)은 라이트 테마이고, 다크 테마는 `theme.js`가 `data-theme="dark"`를 붙여야 적용됩니다.
처음에는 색 `transition` 때문에 다크 모드 사용자가 페이지를 열 때마다 **라이트 → 다크로 0.3초 동안 서서히 바뀌는** 현상이 있었습니다.
그래서 `initTheme`이 첫 테마를 적용하는 동안에만 `<html class="no-transition">`으로 전환 효과를 끄고, 2프레임 뒤에 다시 켜도록 고쳤습니다.

다만 `theme.js`도 요구사항대로 `defer`로 연결했기 때문에, 느린 환경에서는 HTML이 먼저 그려진 뒤 스크립트가 실행되어 **아주 짧게** 라이트 화면이 보일 수 있습니다.
`<head>`에 `defer` 없는 작은 스크립트를 두면 완전히 없앨 수 있지만, "JS는 `defer`로 연결" 요구사항을 우선했습니다.

### 7.2 스크롤 애니메이션과 JS가 꺼진 환경
`.reveal` 요소는 `<html class="js">`일 때만 처음에 숨겨집니다 (`.js .reveal { opacity: 0 }`).
JS가 동작하지 않으면 `.js` 클래스가 붙지 않으므로 콘텐츠가 숨겨진 채 남지 않습니다.
"동작 줄이기" 설정을 켠 사용자에게는 애니메이션 없이 바로 보여줍니다.

### 7.3 `innerHTML`과 XSS
`innerHTML`은 문자열을 HTML로 해석하므로, 저장소 설명에 `<img src=x onerror=...>` 같은 값이 있으면 스크립트가 실행될 수 있습니다.
그래서 API에서 온 모든 값은 `escapeHTML()`로 `< > & " '`를 바꾼 뒤 넣고, 홈페이지 링크는 `http(s)://`로 시작할 때만 링크로 만듭니다.
사용자 입력을 보여주는 폼 메시지는 처음부터 `textContent`를 써서 이 문제가 생기지 않습니다.

### 7.4 다시 그리기와 포커스
필터 버튼과 카드는 `render()` 때마다 새로 만들어지므로, 키보드 사용자의 포커스가 사라질 수 있습니다.
필터를 누르면 같은 필터 버튼으로, 더 보기를 누르면 새로 나타난 첫 카드로, 다시 시도를 누르면 결과 위치(첫 카드 또는 새 다시 시도 버튼)로 포커스를 옮겨 이를 보완했습니다.
(React는 바뀐 부분만 고치는 "재조정(reconciliation)"으로 이 문제를 자동으로 줄여 줍니다.)

포커스와 관련해 함께 처리한 것:
- **앵커 이동**: `preventDefault()`로 기본 이동을 막으면 포커스가 링크에 남으므로, 이동한 섹션에 `tabindex="-1"`을 주고 포커스를 옮깁니다.
- **모바일 메뉴**: 메뉴 링크가 DOM에서 햄버거 버튼보다 앞에 있어, 열자마자 첫 링크로 포커스를 옮깁니다. 포커스가 헤더 밖으로 나가면 메뉴를 닫습니다.
  메뉴가 열릴 때는 `visibility`가 즉시 `visible`이 되도록 CSS 전환 시간을 열림/닫힘에 따라 다르게 줬습니다 (숨겨진 요소에는 포커스를 줄 수 없기 때문).
- **토글 버튼 이름**: 다크 모드 버튼은 이름을 "다크 모드"로 고정하고 켜짐/꺼짐은 `aria-pressed`로, 햄버거는 이름을 "메뉴"로 고정하고 열림/닫힘은 `aria-expanded`로 알립니다.
  (이름과 상태를 둘 다 바꾸면 "라이트 모드로 전환, 눌림"처럼 모순된 안내가 됩니다)
- **폼 포커스 표시**: 테두리 색은 유효성(빨강/초록)을 나타내므로, 포커스는 테두리와 겹치지 않는 바깥 `outline`으로 표시합니다.

### 7.5 그 밖의 한계
- GitHub API는 인증 없이 **IP당 시간당 60회**입니다. 결과를 캐시하지 않으므로 새로고침할 때마다 1회씩 사용합니다.
- 한 번에 최대 100개 저장소까지만 가져옵니다 (`per_page=100`, 페이지네이션 없음).
- `auto-fit`은 카드가 1~2개뿐일 때 카드를 늘려 빈 칸을 채웁니다. 빈 열을 남기고 싶다면 `auto-fill`을 쓰면 됩니다 (요구사항은 `auto-fit`).
- 프로필 사진과 이메일은 아직 자리표시입니다 → README "개인정보 채우기".
