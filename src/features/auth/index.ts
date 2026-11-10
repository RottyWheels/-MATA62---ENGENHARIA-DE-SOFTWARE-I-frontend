// API pública da feature de autenticação (módulo `identity` do backend, REQ 01–04).
// As páginas não são exportadas aqui: o router as carrega sob demanda (lazy).

export { getMeQueryKey, refreshCsrf, useLogout, useMe } from './api/auth'
export { AUTH_ENDPOINTS } from './api/endpoints'
export type {
  LoginRequest,
  PasswordResetRequest,
  RegisterRequest,
  User,
  UserType,
} from './api/types'
export { RedirectIfAuthenticated } from './components/RedirectIfAuthenticated'
export { RequireAuth } from './components/RequireAuth'
