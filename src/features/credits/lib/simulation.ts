/**
 * Botões "Simular pagamento": só em desenvolvimento (`pnpm dev`) e com
 * `VITE_ENABLE_PAYMENT_SIMULATION=true`. No build de produção, `import.meta.env.DEV` é `false`
 * e os botões nunca aparecem. O backend também precisa de `PAYMENT_SIMULATION_ENABLED=true`.
 *
 * Use junto de `import.meta.env.DEV &&` no ponto de uso: com o `DEV` escrito ali, o build de
 * produção elimina o ramo, e o componente e a chamada `/simulation` nem entram no bundle.
 */
export function isPaymentSimulationEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION === 'true'
}
