/**
 * 사이트 설정값 모음
 * - 여러 파일에서 쓰는 기준값을 한곳에 모아, 값을 바꿀 때 이 파일만 고치면 되게 한다.
 * - README의 "기준값" 표와 같은 값이다.
 */
const CONFIG = Object.freeze({
  // GitHub API로 저장소를 가져올 계정 아이디
  githubUsername: 'NiceTry3675',

  // Projects 섹션에서 처음에 보여줄 카드 수 ("더 보기" 클릭마다 이만큼 추가)
  projectsPageSize: 6,

  // 이 값(px) 이상 스크롤하면 네비게이션 배경색이 바뀐다
  navScrollThreshold: 60,

  // 이 값(px) 이상 스크롤하면 스크롤 탑 버튼이 나타난다
  scrollTopThreshold: 300,

  // 요소가 화면에 이 비율(20%) 이상 보이면 스크롤 애니메이션 실행
  revealThreshold: 0.2,

  // Hero 타이핑 효과 속도(ms)
  typing: {
    typeSpeed: 90,
    deleteSpeed: 45,
    holdDelay: 1600,
  },

  // (선택) Formspree 폼 ID. 예: 'xyzabcde'
  // 비워두면 실제 전송 없이 성공 메시지만 보여주는 "데모 모드"로 동작한다.
  formspreeId: '',
});
