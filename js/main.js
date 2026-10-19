/**
 * 진입점: 모든 기능을 초기화한다.
 * - <script defer>는 HTML 파싱이 끝난 뒤 실행되므로, 여기서는 DOM 요소를 바로 찾을 수 있다.
 * - main.js는 가장 마지막에 연결되어 있어서, 앞의 파일에 정의된 init 함수들을 모두 사용할 수 있다.
 */

// CSS에서 .js .reveal처럼 "JS가 동작할 때만" 적용할 스타일의 기준 클래스
document.documentElement.classList.add('js');

initTheme();
initNav();
initScrollEffects();
initReveal();
initTyping();
initProjects();
initContactForm();

// 푸터 저작권 연도를 현재 연도로
document.querySelector('.site-footer__year').textContent = new Date().getFullYear();
