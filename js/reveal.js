/**
 * 스크롤 애니메이션 (Intersection Observer)
 * - .reveal 요소가 화면에 CONFIG.revealThreshold(20%) 이상 보이면 .visible 클래스를 붙인다.
 * - 한 번 나타난 요소는 관찰을 중단한다 (unobserve).
 * - projects.js처럼 나중에 만들어진 요소도 observeReveal()로 등록할 수 있다.
 */
const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            target.classList.add('visible');
            observer.unobserve(target);
          });
        },
        { threshold: CONFIG.revealThreshold },
      )
    : null;

const observeReveal = (elements) => {
  elements.forEach((element) => {
    if (revealObserver) {
      revealObserver.observe(element);
    } else {
      element.classList.add('visible'); // 지원하지 않는 브라우저에서는 바로 표시
    }
  });
};

const initReveal = () => {
  observeReveal(document.querySelectorAll('.reveal'));
};
