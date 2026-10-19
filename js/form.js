/**
 * Contact 폼 유효성 검사
 *
 * 이벤트        → 상태 변경                         → 화면 업데이트
 * input         → errors (입력할 때마다 다시 검사)  → 에러 메시지 표시/숨김
 * blur(포커스 아웃) → touched (한 번 입력을 마친 칸)  → 그때부터 에러 표시
 * submit        → 전체 검사 → status              → 성공/실패 메시지
 *
 * 처음 입력하는 도중부터 빨간 에러가 뜨면 불편하므로,
 * 칸을 한 번 벗어났거나(touched) 제출을 시도한 뒤에만 에러를 보여준다.
 */
const initContactForm = () => {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const submitButton = form.querySelector('.contact-form__submit');
  const statusElement = form.querySelector('.contact-form__status');
  const FIELD_NAMES = ['name', 'email', 'message'];
  const MESSAGE_MIN_LENGTH = 10;
  // 간단한 이메일 형식: 공백·@ 없는 문자 + @ + 도메인 + . + 최상위 도메인(2자 이상)
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // ---------- 검사 규칙: 값 → 에러 메시지 (문제가 없으면 빈 문자열) ----------
  const validators = {
    name: (value) => (value ? '' : '이름을 입력해 주세요.'),
    email: (value) => {
      if (!value) return '이메일을 입력해 주세요.';
      if (!EMAIL_PATTERN.test(value)) return '올바른 이메일 형식이 아닙니다. (예: name@example.com)';
      return '';
    },
    message: (value) => {
      if (!value) return '메시지를 입력해 주세요.';
      if (value.length < MESSAGE_MIN_LENGTH) {
        return `메시지를 ${MESSAGE_MIN_LENGTH}자 이상 입력해 주세요. (현재 ${value.length}자)`;
      }
      return '';
    },
  };

  const getValue = (name) => form.elements[name].value.trim();
  const validateField = (name) => validators[name](getValue(name));
  // 모든 칸을 검사해 { name: '...', email: '', message: '...' } 형태로 반환
  const validateAll = () => Object.fromEntries(FIELD_NAMES.map((name) => [name, validateField(name)]));
  const createFlags = (value) => Object.fromEntries(FIELD_NAMES.map((name) => [name, value]));

  // ---------- 상태 ----------
  let state = {
    errors: validateAll(),
    touched: createFlags(false),
    status: 'idle', // 'submitting' | 'success' | 'error'
    submittedName: '',
  };

  const setState = (changes) => {
    state = { ...state, ...changes };
    render();
  };

  // ---------- 렌더링 ----------
  const STATUS_MESSAGES = {
    idle: () => '',
    submitting: () => '',
    success: ({ submittedName }) =>
      CONFIG.formspreeId
        ? `${submittedName}님, 메시지가 전송되었습니다! 확인 후 답변드릴게요.`
        : `${submittedName}님, 메시지가 접수되었습니다! (현재 데모 모드라 실제 이메일은 발송되지 않습니다.)`,
    error: () => '메시지 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  };

  const render = () => {
    const { errors, touched, status } = state;

    FIELD_NAMES.forEach((name) => {
      const input = form.elements[name];
      const errorElement = form.querySelector(`#${name}-error`);
      const showError = touched[name] && errors[name] !== '';
      const showValid = touched[name] && errors[name] === '';

      errorElement.textContent = showError ? errors[name] : '';
      input.classList.toggle('invalid', showError);
      input.classList.toggle('valid', showValid);
      input.setAttribute('aria-invalid', String(showError));
    });

    const isSubmitting = status === 'submitting';
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? '보내는 중...' : '보내기';

    statusElement.textContent = STATUS_MESSAGES[status](state);
    statusElement.classList.toggle('success', status === 'success');
    statusElement.classList.toggle('error', status === 'error');
  };

  // ---------- 전송 ----------
  const sendMessage = async (formData) => {
    // Formspree ID가 없으면 실제 전송 없이 잠깐 기다렸다가 성공 처리 (데모 모드)
    if (!CONFIG.formspreeId) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return;
    }

    const response = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Formspree 응답 오류 (${response.status})`);
  };

  // ---------- 이벤트 연결 ----------
  // input: 입력할 때마다 해당 칸만 다시 검사 (이벤트 위임 — 폼 하나에 리스너 하나)
  form.addEventListener('input', ({ target }) => {
    const { name } = target;
    if (!FIELD_NAMES.includes(name)) return;

    setState({
      errors: { ...state.errors, [name]: validateField(name) },
      // 성공/실패 메시지가 떠 있는 상태에서 다시 입력하면 메시지를 지운다
      status: state.status === 'submitting' ? 'submitting' : 'idle',
    });
  });

  // focusout: blur와 같지만 버블링되므로 폼에서 한 번에 받을 수 있다
  form.addEventListener('focusout', ({ target }) => {
    const { name } = target;
    if (!FIELD_NAMES.includes(name) || state.touched[name]) return;
    // 아무것도 입력하지 않고 지나간 칸은 아직 에러를 띄우지 않는다
    if (getValue(name) === '') return;

    setState({
      errors: { ...state.errors, [name]: validateField(name) },
      touched: { ...state.touched, [name]: true },
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // 페이지 새로고침(기본 제출 동작)을 막는다
    if (state.status === 'submitting') return;

    const errors = validateAll();
    setState({ errors, touched: createFlags(true), status: 'idle' });

    // 에러가 있으면 첫 번째 잘못된 칸으로 포커스를 옮기고 중단
    const firstInvalidName = FIELD_NAMES.find((name) => errors[name] !== '');
    if (firstInvalidName) {
      form.elements[firstInvalidName].focus();
      return;
    }

    const submittedName = getValue('name');
    setState({ status: 'submitting' });

    try {
      await sendMessage(new FormData(form));
      form.reset();
      setState({
        errors: validateAll(),
        touched: createFlags(false),
        status: 'success',
        submittedName,
      });
    } catch (error) {
      console.error('[Contact] 전송 실패:', error);
      setState({ status: 'error' });
    }
  });

  render();
};
