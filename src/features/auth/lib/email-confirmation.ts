/** Validade do link de confirmação (`CONFIRMATION_TOKEN_VALIDITY` no backend). */
export const CONFIRMATION_LINK_VALIDITY_HOURS = 24

/** Intervalo mínimo entre reenvios (`confirmation-resend-interval` no backend). */
export const RESEND_COOLDOWN_SECONDS = 60

/** 403 do login quando a senha está certa, mas o e-mail ainda não foi confirmado. */
export const EMAIL_NOT_CONFIRMED_CODE = 'EMAIL_NAO_CONFIRMADO'

/**
 * Ref de callback que põe o foco no elemento quando ele aparece. Fica fora dos componentes para
 * ter identidade estável: o React só a chama ao montar (ou ao remontar por mudança de `key`).
 */
export function focusOnMount(element: HTMLElement | null) {
  element?.focus()
}

/** Anel de foco para mensagens que recebem o foco por código (`tabIndex={-1}`). */
export const focusTargetClass = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
