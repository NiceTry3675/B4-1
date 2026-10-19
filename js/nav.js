/**
 * 네비게이션
 * 1) 햄버거 메뉴: 클릭 → isMenuOpen 상태 변경 → .active 클래스 토글
 * 2) 부드러운 스크롤: 앵커 클릭 → 기본 이동 막기 → 해당 섹션으로 smooth 스크롤
 * 3) 현재 섹션 표시: 화면 가운데에 있는 섹션의 메뉴에 .active 표시
 */
const initNav = () => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.nav__menu');
  const hamburger = document.querySelector('.nav__hamburger');
  const menuLinks = document.querySelectorAll('.nav__link');
  // 페이지 안 섹션으로 이동하는 모든 링크 (로고, 메뉴, CTA 버튼). 본문 바로가기 링크는 제외
  const anchorLinks = document.querySelectorAll('a[href^="#"]:not(.skip-link)');
  const desktopQuery = window.matchMedia('(min-width: 768px)');

  // ---------- 1. 햄버거 메뉴 ----------
  let isMenuOpen = false;

  const renderMenu = () => {
    menu.classList.toggle('active', isMenuOpen);
    hamburger.classList.toggle('active', isMenuOpen);
    header.classList.toggle('menu-open', isMenuOpen);
    // 열림/닫힘은 aria-expanded로 알린다 (버튼 이름 "메뉴"는 그대로 둔다)
    hamburger.setAttribute('aria-expanded', String(isMenuOpen));
  };

  const setMenuOpen = (nextOpen) => {
    if (isMenuOpen === nextOpen) return;
    isMenuOpen = nextOpen;
    renderMenu();
  };

  // 클릭할 때마다 열림 ↔ 닫힘
  hamburger.addEventListener('click', () => {
    setMenuOpen(!isMenuOpen);
    // 메뉴 링크는 DOM에서 햄버거 버튼보다 앞에 있으므로,
    // 열었을 때 첫 링크로 포커스를 옮겨 키보드 사용자가 바로 메뉴를 탐색할 수 있게 한다
    if (isMenuOpen) menuLinks[0].focus();
  });

  // 키보드 포커스가 헤더(메뉴) 밖으로 나가면 닫기
  header.addEventListener('focusout', ({ relatedTarget }) => {
    if (isMenuOpen && relatedTarget && !header.contains(relatedTarget)) setMenuOpen(false);
  });

  // Esc 키로 닫기 (닫은 뒤 포커스를 햄버거 버튼으로 돌려준다)
  document.addEventListener('keydown', ({ key }) => {
    if (key !== 'Escape' || !isMenuOpen) return;
    setMenuOpen(false);
    hamburger.focus();
  });

  // 메뉴 바깥을 클릭하면 닫기
  document.addEventListener('click', ({ target }) => {
    if (isMenuOpen && !header.contains(target)) setMenuOpen(false);
  });

  // 메뉴가 열린 채로 태블릿 이상 크기로 늘리면 닫힌 상태로 정리
  desktopQuery.addEventListener('change', ({ matches }) => {
    if (matches) setMenuOpen(false);
  });

  // ---------- 2. 부드러운 스크롤 ----------
  const handleAnchorClick = (event) => {
    const { hash } = event.currentTarget; // 예: '#about'
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return; // 이동할 섹션이 없으면 브라우저 기본 동작에 맡긴다

    event.preventDefault(); // 순간이동(기본 동작)을 막고
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); // 부드럽게 이동
    history.pushState(null, '', hash); // 주소창 해시도 갱신 (뒤로 가기 지원)
    setMenuOpen(false); // 모바일 메뉴는 닫는다

    // 기본 동작을 막으면 키보드 포커스는 링크에 남는다 → 이동한 섹션으로 포커스도 옮겨,
    // 다음 Tab이 그 섹션 안의 요소부터 시작되게 한다 (tabindex="-1": 코드로만 포커스 가능)
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  anchorLinks.forEach((link) => link.addEventListener('click', handleAnchorClick));

  // ---------- 3. 현재 보고 있는 섹션 표시 ----------
  let activeSectionId = '';

  const renderActiveLink = () => {
    menuLinks.forEach((link) => {
      const isActive = link.hash === `#${activeSectionId}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  if ('IntersectionObserver' in window) {
    // 화면 세로 가운데 줄(위·아래 50%를 잘라낸 영역)에 걸친 섹션을 "현재 섹션"으로 본다
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          activeSectionId = target.id;
          renderActiveLink();
        });
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );

    document.querySelectorAll('main section[id]').forEach((section) => sectionObserver.observe(section));
  }
};
