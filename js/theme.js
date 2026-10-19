/**
 * 다크 모드
 * 이벤트(토글 클릭) → 상태 변경(theme) → 화면 업데이트(<html data-theme>)
 * - 선택한 테마는 localStorage에 저장해 새로고침 후에도 유지한다.
 * - 저장된 값이 없으면 OS 설정(prefers-color-scheme)을 따른다. (보너스)
 */
const initTheme = () => {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;
  const toggleButton = document.querySelector('.theme-toggle');
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // 시크릿 모드 등에서 localStorage 접근이 막혀도 사이트가 멈추지 않도록 try/catch
  const loadSavedTheme = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  };

  const saveTheme = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 저장할 수 없는 환경이면 이번 방문 동안만 적용된다
    }
  };

  const getSystemTheme = () => (systemDarkQuery.matches ? 'dark' : 'light');

  // 상태: 현재 테마
  let theme = loadSavedTheme() ?? getSystemTheme();

  // 렌더링: 상태를 화면에 반영
  const render = () => {
    const isDark = theme === 'dark';
    root.dataset.theme = theme; // <html data-theme="dark"> → CSS 변수가 다크 값으로 바뀜
    // 버튼 이름은 "다크 모드"로 고정하고, 켜짐/꺼짐은 aria-pressed로 알린다
    toggleButton.setAttribute('aria-pressed', String(isDark));
  };

  // 상태 변경 함수: 상태를 바꾸고 반드시 render()를 호출한다
  const setTheme = (nextTheme, { persist = true } = {}) => {
    theme = nextTheme;
    if (persist) saveTheme(nextTheme);
    render();
  };

  toggleButton.addEventListener('click', () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  });

  // 사용자가 직접 고른 적이 없을 때만 OS 테마 변경을 따라간다
  systemDarkQuery.addEventListener('change', ({ matches }) => {
    if (loadSavedTheme()) return;
    setTheme(matches ? 'dark' : 'light', { persist: false });
  });

  // 첫 렌더링은 색 전환 애니메이션 없이 즉시 적용한다.
  // (그대로 두면 페이지를 열 때마다 라이트 → 다크로 0.3초 동안 서서히 바뀌는 깜빡임이 생긴다)
  root.classList.add('no-transition');
  render();
  // 브라우저가 바뀐 테마로 한 번 그린 다음(2프레임 뒤) 전환 효과를 다시 켠다
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('no-transition'));
  });
};
