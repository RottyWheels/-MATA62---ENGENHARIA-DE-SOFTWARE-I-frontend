import { DEMO_USER } from '@/mocks/handlers/auth'
import { http } from '@/shared/api/http'

/** Abre a sessão simulada do usuário de demonstração (mocks MSW). */
export async function loginAsDemo() {
  await http.post('/auth/login', { email: DEMO_USER.email, password: DEMO_USER.password })
}

/** Cria uma conta comum (sem créditos nos mocks) e entra com ela. */
export async function loginAsNewUser(email: string) {
  const password = 'Senha#Forte1'
  await http.post('/auth/register', {
    type: 'COMUM',
    fullName: 'Conta de Teste',
    email,
    password,
    cpf: '11144477735',
  })
  await http.post('/auth/login', { email, password })
}

/** Saldo de créditos da sessão (`GET /api/me`). */
export async function sessionBalance() {
  const { data } = await http.get<{ creditBalance?: number }>('/me')
  return data.creditBalance
}
