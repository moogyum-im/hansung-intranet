// Supabase Auth 에러를 한글 안내 메시지로 변환
const CODE_MESSAGES = {
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '이메일 인증이 완료되지 않았습니다. 이메일함을 확인해주세요.',
    user_banned: '이용이 제한된 계정입니다. 관리자에게 문의해주세요.',
    user_not_found: '가입되지 않은 이메일입니다.',
    email_address_invalid: '올바른 이메일 주소를 입력해주세요.',
    weak_password: '비밀번호가 너무 약합니다. 더 안전한 비밀번호를 사용해주세요.',
    same_password: '새 비밀번호가 기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.',
    session_expired: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    session_not_found: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    refresh_token_not_found: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    refresh_token_already_used: '다른 곳에서 이미 세션이 갱신되었습니다. 다시 로그인해주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    over_email_send_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    signup_disabled: '현재 회원가입이 비활성화되어 있습니다.',
    validation_failed: '입력하신 내용을 다시 확인해주세요.',
    reauthentication_needed: '보안을 위해 다시 로그인 후 시도해주세요.',
    captcha_failed: '보안 확인에 실패했습니다. 다시 시도해주세요.',
};

const MESSAGE_PATTERNS = [
    [/invalid login credentials/i, '이메일 또는 비밀번호가 올바르지 않습니다.'],
    [/email not confirmed/i, '이메일 인증이 완료되지 않았습니다. 이메일함을 확인해주세요.'],
    [/user not found/i, '가입되지 않은 이메일입니다.'],
    [/user.*banned|banned.*user/i, '이용이 제한된 계정입니다. 관리자에게 문의해주세요.'],
    [/password.*at least|password.*should be/i, '비밀번호가 너무 약합니다. 더 안전한 비밀번호를 사용해주세요.'],
    [/same.*password|new password should be different/i, '새 비밀번호가 기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.'],
    [/rate limit|too many requests/i, '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'],
    [/session.*expired|session.*not found|jwt expired/i, '로그인 세션이 만료되었습니다. 다시 로그인해주세요.'],
    [/refresh token/i, '로그인 세션이 만료되었습니다. 다시 로그인해주세요.'],
    [/network|fetch|internet/i, '네트워크 연결을 확인한 뒤 다시 시도해주세요.'],
];

export function translateAuthError(error, fallback = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') {
    if (!error) return fallback;

    if (error.code && CODE_MESSAGES[error.code]) {
        return CODE_MESSAGES[error.code];
    }

    const message = error.message || '';
    for (const [pattern, translated] of MESSAGE_PATTERNS) {
        if (pattern.test(message)) return translated;
    }

    return fallback;
}
