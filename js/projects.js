/**
 * Projects 섹션 — GitHub API 연동
 *
 * 이벤트                    → 상태 변경                              → 화면 업데이트
 * 페이지 로드 / 다시 시도   → status: loading → success|empty|error  → 스피너 / 카드 / 메시지
 * 언어 필터 클릭            → filter                                  → 해당 언어 카드만 표시
 * 더 보기 클릭              → visibleCount                            → 카드 추가 표시
 *
 * 모든 상태 변경은 setState()를 거치고, setState()는 항상 render()를 호출한다.
 * (React의 useState → 리렌더링 흐름과 같은 구조)
 */
const initProjects = () => {
  const section = document.querySelector('#projects');
  if (!section) return;

  const filtersElement = section.querySelector('.projects__filters');
  const statusElement = section.querySelector('.projects__status');
  const gridElement = section.querySelector('.projects__grid');
  const moreButton = section.querySelector('.projects__more-btn');

  const { githubUsername, projectsPageSize } = CONFIG;
  const API_URL = `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=100`;
  const ALL = 'all';
  const NO_LANGUAGE = '기타';

  // ---------- 상태 ----------
  let state = {
    status: 'idle', // 'loading' | 'success' | 'empty' | 'error'
    repos: [],
    filter: ALL,
    visibleCount: projectsPageSize,
    animateFrom: 0, // 이 순서부터의 카드에만 등장 애니메이션 적용 (더 보기 시 기존 카드는 그대로)
    errorMessage: '',
  };

  const setState = (changes) => {
    state = { ...state, ...changes };
    render();
  };

  // ---------- 데이터 가공 ----------
  // API 응답 객체에서 필요한 값만 구조분해 할당으로 꺼내 화면용 객체로 바꾼다
  const toRepo = ({
    name,
    description,
    html_url: url,
    homepage,
    language,
    stargazers_count: stars,
    forks_count: forks,
    updated_at: updatedAt,
    topics = [],
  }) => ({
    name,
    description,
    url,
    homepage,
    language: language ?? NO_LANGUAGE,
    stars,
    forks,
    updatedAt,
    topics,
  });

  // 현재 필터에 맞는 저장소만 고른다
  const getFilteredRepos = () => {
    const { repos, filter } = state;
    return filter === ALL ? repos : repos.filter(({ language }) => language === filter);
  };

  // 언어별 저장소 개수 → [['Python', 16], ['TypeScript', 4], ...] (많은 순)
  const getLanguageCounts = (repos) => {
    const counts = repos.reduce((acc, { language }) => {
      acc[language] = (acc[language] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  };

  const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

  const isSafeUrl = (url) => /^https?:\/\//i.test(url ?? '');

  // ---------- 에러 메시지 ----------
  const createApiError = (response) => {
    const error = new Error(`GitHub API 응답 오류 (${response.status})`);
    error.status = response.status;
    error.rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    error.rateLimitReset = response.headers.get('x-ratelimit-reset');
    return error;
  };

  const getErrorMessage = ({ status, rateLimitRemaining, rateLimitReset }) => {
    // 인증 없이 호출하면 시간당 60회 제한 → 초과 시 403(또는 429) 응답
    if (status === 429 || (status === 403 && rateLimitRemaining === '0')) {
      if (!rateLimitReset) return 'GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
      const resetTime = new Date(Number(rateLimitReset) * 1000).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `GitHub API 요청 한도(시간당 60회)를 초과했습니다. ${resetTime} 이후에 다시 시도해 주세요.`;
    }
    if (status === 403) return 'GitHub API 접근이 거부되었습니다. (403) 잠시 후 다시 시도해 주세요.';
    if (status === 404) return `GitHub 사용자 "${githubUsername}"를 찾을 수 없습니다.`;
    if (status) return `GitHub 서버 응답에 문제가 있습니다. (오류 코드 ${status})`;
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  };

  // ---------- API 호출 ----------
  const fetchRepos = async () => {
    if (state.status === 'loading') return; // 요청 중 중복 호출 방지

    setState({ status: 'loading', errorMessage: '' });

    try {
      const response = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
      // fetch는 404·403이어도 예외를 던지지 않으므로 response.ok를 직접 확인해야 한다
      if (!response.ok) throw createApiError(response);

      const data = await response.json();
      const repos = data.filter(({ fork }) => !fork).map(toRepo); // 포크한 저장소는 제외

      setState({
        status: repos.length > 0 ? 'success' : 'empty',
        repos,
        filter: ALL,
        visibleCount: projectsPageSize,
        animateFrom: 0,
      });
    } catch (error) {
      console.error('[Projects] 저장소를 불러오지 못했습니다:', error);
      setState({ status: 'error', errorMessage: getErrorMessage(error) });
    }
  };

  // ---------- 템플릿 (템플릿 리터럴로 HTML 생성) ----------
  const ICONS = {
    star: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    fork: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/></svg>',
  };

  const createStatusTemplate = () => {
    const { status, errorMessage, filter, visibleCount } = state;
    const filteredCount = getFilteredRepos().length;
    const filterLabel = filter === ALL ? '전체' : filter;

    switch (status) {
      case 'loading':
        return `
          <div class="state state--loading">
            <span class="spinner" aria-hidden="true"></span>
            <p class="state__title">프로젝트를 불러오는 중...</p>
          </div>`;
      case 'error':
        return `
          <div class="state state--error">
            <p class="state__title">프로젝트를 불러올 수 없습니다.</p>
            <p class="state__desc">${escapeHTML(errorMessage)}</p>
            <button class="btn btn--primary state__retry" type="button">다시 시도</button>
          </div>`;
      case 'empty':
        return `
          <div class="state state--empty">
            <p class="state__title">표시할 프로젝트가 없습니다.</p>
          </div>`;
      case 'success':
        // 필터 결과가 0개인 경우도 "빈 상태"로 보여준다
        if (filteredCount === 0) {
          return `
            <div class="state state--empty">
              <p class="state__title">표시할 프로젝트가 없습니다.</p>
            </div>`;
        }
        return `<p class="projects__summary">${escapeHTML(filterLabel)} ${filteredCount}개 중 ${Math.min(visibleCount, filteredCount)}개 표시 중</p>`;
      default:
        return '';
    }
  };

  const createFilterButton = ([language, count]) => {
    const isActive = state.filter === language;
    const label = language === ALL ? '전체' : language;
    // aria-pressed: 토글 버튼의 눌림 상태를 스크린 리더에 알린다
    return `
      <button class="filter-btn${isActive ? ' active' : ''}" type="button"
        data-filter="${escapeHTML(language)}" aria-pressed="${isActive}">
        ${escapeHTML(label)}<span class="filter-btn__count">${count}</span>
      </button>`;
  };

  const createCard = (repo, index) => {
    const { name, description, url, homepage, language, stars, forks, updatedAt, topics } = repo;
    const revealClass = index >= state.animateFrom ? ' reveal' : '';

    const descriptionHTML = description
      ? `<p class="project-card__desc">${escapeHTML(description)}</p>`
      : '<p class="project-card__desc project-card__desc--empty">설명이 없습니다.</p>';

    const topicsHTML =
      topics.length > 0
        ? `<ul class="project-card__topics">${topics
            .slice(0, 4)
            .map((topic) => `<li class="project-card__topic">#${escapeHTML(topic)}</li>`)
            .join('')}</ul>`
        : '';

    const demoHTML = isSafeUrl(homepage)
      ? `<a class="project-card__demo" href="${escapeHTML(homepage)}" target="_blank" rel="noopener noreferrer">데모 보기 →</a>`
      : '';

    return `
      <article class="project-card${revealClass}">
        <h3 class="project-card__title">
          <a class="project-card__link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)}</a>
        </h3>
        ${descriptionHTML}
        ${topicsHTML}
        ${demoHTML}
        <footer class="project-card__meta">
          <span class="project-card__stat" data-lang="${escapeHTML(language)}">
            <span class="lang-dot" aria-hidden="true"></span>${escapeHTML(language)}
          </span>
          <span class="project-card__stat">${ICONS.star}<span class="visually-hidden">스타</span>${stars}</span>
          <span class="project-card__stat">${ICONS.fork}<span class="visually-hidden">포크</span>${forks}</span>
          <time class="project-card__updated" datetime="${escapeHTML(updatedAt)}">${formatDate(updatedAt)}</time>
        </footer>
      </article>`;
  };

  // ---------- 렌더링: 현재 상태 → 화면 ----------
  const render = () => {
    const { status, repos, visibleCount } = state;
    const isSuccess = status === 'success';
    const filteredRepos = isSuccess ? getFilteredRepos() : [];
    const visibleRepos = filteredRepos.slice(0, visibleCount);

    section.setAttribute('aria-busy', String(status === 'loading'));

    // 1) 상태 메시지 (로딩 / 에러 / 빈 상태 / 결과 요약)
    statusElement.innerHTML = createStatusTemplate();

    // 2) 언어 필터 버튼 (성공 상태에서만)
    filtersElement.innerHTML = isSuccess
      ? [[ALL, repos.length], ...getLanguageCounts(repos)].map(createFilterButton).join('')
      : '';

    // 3) 카드 목록: map으로 데이터 배열 → HTML 문자열 배열 → join으로 하나의 문자열
    gridElement.innerHTML = visibleRepos.map(createCard).join('');
    observeReveal(gridElement.querySelectorAll('.reveal'));

    // 4) 더 보기 버튼
    const remaining = filteredRepos.length - visibleRepos.length;
    moreButton.hidden = remaining <= 0;
    moreButton.textContent = `더 보기 (${remaining}개 남음)`;
  };

  // ---------- 이벤트 연결 ----------
  // 다시 시도 버튼은 render()마다 새로 만들어지므로, 부모에 한 번만 리스너를 다는 "이벤트 위임"을 쓴다
  statusElement.addEventListener('click', async ({ target }) => {
    if (!target.closest('.state__retry')) return;
    await fetchRepos();
    // 누른 버튼이 다시 그려지며 사라져 포커스가 <body>로 빠졌다면,
    // 결과 위치로 옮겨준다 (성공: 첫 카드 링크, 실패: 새로 그려진 다시 시도 버튼)
    if (document.activeElement !== document.body) return;
    const nextFocus = statusElement.querySelector('.state__retry') ?? gridElement.querySelector('.project-card__link');
    nextFocus?.focus();
  });

  filtersElement.addEventListener('click', ({ target }) => {
    const button = target.closest('.filter-btn');
    if (!button || button.dataset.filter === state.filter) return;
    const { filter } = button.dataset;
    setState({ filter, visibleCount: projectsPageSize, animateFrom: 0 });
    // 버튼이 새로 그려지면서 사라진 포커스를 같은 버튼에 돌려준다 (키보드 사용자 배려)
    filtersElement.querySelector(`[data-filter="${CSS.escape(filter)}"]`)?.focus();
  });

  moreButton.addEventListener('click', () => {
    const { visibleCount } = state;
    setState({ visibleCount: visibleCount + projectsPageSize, animateFrom: visibleCount });
    // 키보드 사용자를 위해 새로 나타난 첫 카드의 링크로 포커스 이동
    gridElement.querySelectorAll('.project-card__link')[visibleCount]?.focus();
  });

  fetchRepos();
};
