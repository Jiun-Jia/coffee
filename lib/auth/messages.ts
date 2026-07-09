/**
 * Supabase Auth 錯誤 → 繁中訊息映射（AUTH-2）。
 * 以 AuthError.code 為主鍵；未知錯誤給籠統訊息避免洩漏內部細節。
 */

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email 或密碼錯誤',
  user_already_exists: '這個 Email 已經註冊過了',
  email_exists: '這個 Email 已經註冊過了',
  weak_password: '密碼強度不足（至少 6 個字元）',
  over_request_rate_limit: '嘗試次數過多，請稍後再試',
  over_email_send_rate_limit: '寄信次數已達上限，請稍後再試',
  email_not_confirmed: '此帳號尚未完成 Email 確認',
  same_password: '新密碼不可與舊密碼相同',
  session_expired: '登入已過期，請重新登入',
  refresh_token_not_found: '登入已過期，請重新登入',
}

/**
 * profiles trigger raise 時，Supabase 只回籠統的 unexpected_failure /
 * "Database error saving new user" —— 最可能的原因是 username 撞名
 * （AUTH-3 預檢後仍可能有競態）。
 */
const TRIGGER_FAILURE_HINT =
  '註冊失敗：使用者名稱可能剛被別人使用，請換一個再試'

export function authErrorMessage(error: {
  code?: string
  message?: string
}): string {
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code]
  }
  if (error.message?.includes('Database error saving new user')) {
    return TRIGGER_FAILURE_HINT
  }
  return '發生錯誤，請稍後再試'
}
