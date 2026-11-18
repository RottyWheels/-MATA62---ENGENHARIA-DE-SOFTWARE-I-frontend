/**
 * Caminhos da API de autenticação (backend, módulo `identity`).
 * `me` ainda não está no `desenv`, e `emailConfirmation*` está na branch `feature/email-confirmation`:
 * ver README, "Integração com o backend".
 */
export const AUTH_ENDPOINTS = {
  csrf: '/api/auth/csrf',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  register: '/api/auth/register',
  passwordReset: '/api/auth/password-reset',
  passwordResetConfirm: '/api/auth/password-reset/confirm',
  emailConfirmationConfirm: '/api/auth/email-confirmation/confirm',
  emailConfirmationResend: '/api/auth/email-confirmation/resend',
  me: '/api/me',
} as const
