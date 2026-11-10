/**
 * Caminhos da API de autenticação — contrato PROVISÓRIO (README, pendências 2–4).
 * Centralizados aqui para facilitar a troca quando o backend confirmar.
 */
export const AUTH_ENDPOINTS = {
  csrf: '/api/auth/csrf',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  register: '/api/auth/register',
  passwordReset: '/api/auth/password-reset',
  me: '/api/me',
} as const
