/**
 * Hero 타이핑 효과 (보너스)
 * - data-words 속성의 문구들을 한 글자씩 쓰고 지우기를 반복한다.
 * - 스크린 리더에는 전체 문구를 한 번에 읽어주고, 글자 단위 변화는 숨긴다(aria-hidden).
 */
const initTyping = () => {
  const typingElement = document.querySelector('.typing');
  const srElement = document.querySelector('.hero__role-sr');
  if (!typingElement) return;

  const words = (typingElement.dataset.words ?? '')
    .split(',')
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
  if (words.length === 0) return;

  srElement.textContent = words.join(', ');
  typingElement.setAttribute('aria-hidden', 'true');

  // 움직임 줄이기 설정이면 첫 문구만 고정해서 보여준다
  if (prefersReducedMotion()) {
    typingElement.textContent = words[0];
    return;
  }

  const { typeSpeed, deleteSpeed, holdDelay } = CONFIG.typing;

  // 상태: 몇 번째 문구의 몇 글자까지 보이는지, 지우는 중인지
  let state = { wordIndex: 0, charCount: 0, isDeleting: false };

  const tick = () => {
    const { wordIndex, charCount, isDeleting } = state;
    // [...문자열]: 이모지처럼 2칸을 차지하는 문자도 한 글자로 나눈다
    const characters = [...words[wordIndex]];
    const nextCount = charCount + (isDeleting ? -1 : 1);

    // 렌더링
    typingElement.textContent = characters.slice(0, nextCount).join('');

    // 다음 상태와 다음 실행까지의 대기 시간 결정
    let delay = isDeleting ? deleteSpeed : typeSpeed;
    let nextState = { wordIndex, charCount: nextCount, isDeleting };

    if (!isDeleting && nextCount === characters.length) {
      nextState = { ...nextState, isDeleting: true }; // 다 썼으면 잠시 멈췄다가 지우기 시작
      delay = holdDelay;
    } else if (isDeleting && nextCount === 0) {
      nextState = { wordIndex: (wordIndex + 1) % words.length, charCount: 0, isDeleting: false };
      delay = typeSpeed * 4;
    }

    state = nextState;
    setTimeout(tick, delay);
  };

  // 처음에는 HTML에 들어 있던 대체 문구를 지우고 시작
  typingElement.textContent = '';
  setTimeout(tick, typeSpeed * 4);
};
