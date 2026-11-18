import { MailCheckIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

import {
  CONFIRMATION_LINK_VALIDITY_HOURS,
  focusOnMount,
  focusTargetClass,
} from '../lib/email-confirmation'
import { authLinkClass } from '../lib/styles'
import { AuthCard } from './AuthCard'
import { ResendConfirmationEmail } from './ResendConfirmationEmail'

/**
 * Depois do cadastro: o login só funciona após o link do e-mail (o backend responderia 403),
 * então a tela pede a confirmação em vez de entrar ou ir direto para o login.
 */
export function CheckEmailNotice({ email }: { email: string }) {
  return (
    <AuthCard
      title="Confirme seu e-mail"
      footer={
        <p className="text-right">
          <Link to="/login" state={{ email }} className={authLinkClass}>
            Ir para o login
          </Link>
        </p>
      }
    >
      <Alert ref={focusOnMount} tabIndex={-1} role="status" className={focusTargetClass}>
        <MailCheckIcon />
        <AlertTitle>Conta criada. Falta confirmar o e-mail.</AlertTitle>
        <AlertDescription>
          <p>
            Enviamos um link de confirmação para{' '}
            <strong className="font-medium wrap-break-word text-foreground">{email}</strong>. O link
            vale {CONFIRMATION_LINK_VALIDITY_HOURS} horas.
          </p>
          <p>Não chegou? Confira a caixa de spam ou peça um novo envio.</p>
        </AlertDescription>
      </Alert>
      <ResendConfirmationEmail email={email} />
    </AuthCard>
  )
}
