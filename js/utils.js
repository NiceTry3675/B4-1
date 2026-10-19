/**
 * 여러 모듈에서 함께 쓰는 작은 도우미 함수
 */

// 사용자가 OS에서 "동작 줄이기"를 켰는지 확인 (켰다면 애니메이션을 생략한다)
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// innerHTML에 외부 데이터(GitHub 저장소 설명 등)를 넣기 전에 HTML 특수문자를 바꿔
// <script> 같은 문자열이 태그로 해석되지 않게 한다 (XSS 방지)
const escapeHTML = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
