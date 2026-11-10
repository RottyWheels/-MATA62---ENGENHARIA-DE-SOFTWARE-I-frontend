import { DEMO_USER } from '@/mocks/handlers/auth'
import { http } from '@/shared/api/http'

/** Abre a sessão simulada do usuário de demonstração (mocks MSW). */
export async function loginAsDemo() {
  await http.post('/auth/login', { email: DEMO_USER.email, password: DEMO_USER.password })
}
