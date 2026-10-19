/**
 * 스크롤 효과
 * 이벤트(scroll) → 상태 변경(isScrolled, showScrollTop) → 화면 업데이트(클래스 추가/제거)
 * - 네비게이션: CONFIG.navScrollThreshold(60px) 이상이면 배경색 변경
 * - 스크롤 탑 버튼: CONFIG.scrollTopThreshold(300px) 이상이면 표시, 클릭 시 맨 위로
 */
const initScrollEffects = () => {
  const header = document.querySelector('.site-header');
  const scrollTopButton = document.querySelector('.scroll-top');
  const logo = document.querySelector('.nav__logo');
  const { navScrollThreshold, scrollTopThreshold } = CONFIG;

  // 상태
  let state = { isScrolled: false, showScrollTop: false };

  // 렌더링
  const render = () => {
    const { isScrolled, showScrollTop } = state;

    // add / remove를 직접 쓴 형태 (아래 toggle(이름, 조건)과 같은 동작)
    if (isScrolled) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    scrollTopButton.classList.toggle('visible', showScrollTop);
  };

  const handleScroll = () => {
    const { scrollY } = window;
    const nextState = {
      isScrolled: scrollY >= navScrollThreshold,
      showScrollTop: scrollY >= scrollTopThreshold,
    };

    // scroll 이벤트는 매우 자주 발생하므로, 상태가 실제로 바뀔 때만 DOM을 건드린다
    if (nextState.isScrolled === state.isScrolled && nextState.showScrollTop === state.showScrollTop) return;

    state = nextState;
    render();
  };

  // passive: true → 스크롤을 막지 않는 리스너임을 브라우저에 알려 스크롤 성능을 지킨다
  window.addEventListener('scroll', handleScroll, { passive: true });

  scrollTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // 키보드 사용자를 위해 포커스도 페이지 맨 위(로고)로 옮긴다
    logo.focus({ preventScroll: true });
  });

  // 페이지 중간에서 새로고침한 경우를 위해 시작할 때 한 번 계산
  handleScroll();
};
