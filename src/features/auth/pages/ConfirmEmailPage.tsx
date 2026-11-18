import { isAxiosError } from 'axios'
import { CircleAlertIcon, CircleCheckIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { refreshCsrf, useConfirmEmail } from '../api/auth'
import { AuthCard } from '../components/AuthCard'
import { ResendConfirmationEmail } from '../components/ResendConfirmationEmail'
import { focusOnMount, focusTargetClass } from '../lib/email-confirmation'
import { authLinkClass } from '../lib/styles'

type Status = 'loading' | 'success' | 'invalid' | 'error'

/** 422 `TOKEN_INVALIDO` (inexistente, expirado ou usado) e 400 (token vazio ou malformado). */
function isInvalidToken(error: unknown) {
  const status = isAxiosError(error) ? error.response?.status : undefined
  return status === 422 || status === 400
}

/**
 * Destino do link de confirmação enviado por e-mail (`/confirmar-email?token=…`,
 * `CONFIRMATION_URL` no backend). A confirmação é um `POST` feito uma única vez ao montar,
 * nunca um `GET` nem um loader: antivírus de e-mail que só abrem o link não confirmam a conta.
 */
export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Lido uma vez: o token sai da URL logo depois e fica só na memória desta página.
  const [token] = useState(() => searchParams.get('token')?.trim() ?? '')
  const hadTokenParam = useRef(searchParams.has('token'))
  const started = useRef(false)
  const { mutate, status: mutationStatus, error } = useConfirmEmail()

  useEffect(() => {
    // O ref sobrevive à montagem dupla do StrictMode: um POST só.
    if (started.current) return
    started.current = true
    // Tira o token da URL (history.replaceState) para ele não ficar no histórico.
    if (hadTokenParam.current) void navigate({ search: '' }, { replace: true })
    if (token) mutate({ token })
  }, [mutate, navigate, token])

  const retry = async () => {
    // Um 403 de CSRF também cai em "erro": renova o cookie antes de tentar de novo.
    await refreshCsrf()
    mutate({ token })
  }

  let status: Status
  if (!token) status = 'invalid'
  else if (mutationStatus === 'success') status = 'success'
  else if (mutationStatus === 'error') status = isInvalidToken(error) ? 'invalid' : 'error'
  else status = 'loading'

  // `key={status}`: cada mensagem nova é montada de novo e recebe o foco (focusOnMount).
  const messageProps = {
    ref: focusOnMount,
    tabIndex: -1,
    className: focusTargetClass,
  } as const

  if (status === 'loading') {
    return (
      <AuthCard title="Confirmação de e-mail">
        <p
          key={status}
          {...messageProps}
          role="status"
          className={cn('flex items-center gap-2 rounded-sm text-sm', focusTargetClass)}
        >
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
          Confirmando seu e-mail...
        </p>
      </AuthCard>
    )
  }

  if (status === 'success') {
    return (
      <AuthCard title="Confirmação de e-mail">
        <Alert key={status} {...messageProps} role="status">
          <CircleCheckIcon />
          <AlertTitle>E-mail confirmado</AlertTitle>
          <AlertDescription>Sua conta está ativa. Entre com seu e-mail e senha.</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthCard>
    )
  }

  if (status === 'error') {
    return (
      <AuthCard title="Confirmação de e-mail">
        <Alert key={status} {...messageProps} variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Não foi possível confirmar seu e-mail</AlertTitle>
          <AlertDescription>Verifique sua conexão e tente novamente em instantes.</AlertDescription>
        </Alert>
        <Button className="w-full" onClick={() => void retry()}>
          Tentar novamente
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Confirmação de e-mail"
      footer={
        <p className="text-right">
          <Link to="/login" className={authLinkClass}>
            Voltar para o login
          </Link>
        </p>
      }
    >
      <Alert key={status} {...messageProps} variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Link inválido ou expirado</AlertTitle>
        <AlertDescription>
          O link pode ter vencido, já ter sido usado ou ter sido substituído por um mais recente.
          Informe seu e-mail para receber um novo.
        </AlertDescription>
      </Alert>
      <ResendConfirmationEmail variant="default" />
    </AuthCard>
  )
}
