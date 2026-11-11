import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { useMe } from '@/features/auth'
import { applyProblemDetailToForm } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatCredits } from '@/shared/lib/format'
import { CEP_MASK, CPF_MASK, PHONE_MASKS, UFS } from '@/shared/lib/validators'

import { usePackages, usePurchase } from '../api/credits'
import type { CreditPackageId, Payment, PaymentMethod } from '../api/types'
import { PackageCards } from '../components/PackageCards'
import { PixDialog } from '../components/PixDialog'
import {
  purchaseDefaultValues,
  purchaseSchema,
  toPurchaseRequest,
  type PurchaseFormValues,
} from '../schemas/purchase'

const PACKAGE_IDS: CreditPackageId[] = ['BASICO', 'MEDIO', 'PREMIUM']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Compra de créditos (REQ 05–06, Figma "Compra Créditos"): escolha do pacote,
 * dados de faturamento e pagamento com Pix (QR Code) ou Mercado Pago.
 * Atende `/creditos` e `/creditos/checkout/:pacoteId` (pacote já escolhido).
 */
export function PurchasePage() {
  const navigate = useNavigate()
  const { pacoteId } = useParams()
  const initialPackage = PACKAGE_IDS.find((id) => id === pacoteId?.toUpperCase())
  const { data: me } = useMe()
  const packages = usePackages()
  const purchase = usePurchase()
  const [formError, setFormError] = useState<string | null>(null)
  const [pixPayment, setPixPayment] = useState<Payment | null>(null)
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null)
  // Uma chave por tentativa de compra: repetir o envio não duplica o pagamento.
  const idempotencyKey = useRef(crypto.randomUUID())

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: purchaseDefaultValues(me, initialPackage),
  })

  // Nome e e-mail vêm da conta (Figma: campos bloqueados). O CPF é digitado:
  // o backend não o devolve em `GET /api/me`, por segurança.
  useEffect(() => {
    if (!me) return
    form.setValue('fullName', me.fullName)
    form.setValue('email', me.email)
  }, [me, form])

  const pay = (method: PaymentMethod) =>
    form.handleSubmit(async (values) => {
      setFormError(null)
      setPendingMethod(method)
      try {
        const payment = await purchase.mutateAsync({
          body: toPurchaseRequest(purchaseSchema.parse(values), method),
          idempotencyKey: idempotencyKey.current,
        })
        idempotencyKey.current = crypto.randomUUID()
        if (method === 'PIX') {
          setPixPayment(payment)
        } else if (payment.checkoutUrl?.startsWith('/')) {
          await navigate(payment.checkoutUrl)
        } else if (payment.checkoutUrl) {
          // Checkout Pro do Mercado Pago (site externo); volta para /creditos/pagamento/:id.
          window.location.assign(payment.checkoutUrl)
        }
      } catch (error) {
        setFormError(
          applyProblemDetailToForm(error, form.setError, {
            fieldMap: {
              'billing.fullName': 'fullName',
              'billing.email': 'email',
              'billing.cpf': 'cpf',
              'billing.phone': 'phone',
              'billing.cep': 'cep',
              'billing.street': 'street',
              'billing.number': 'number',
              'billing.complement': 'complement',
              'billing.neighborhood': 'neighborhood',
              'billing.city': 'city',
              'billing.state': 'state',
            },
          }),
        )
      } finally {
        setPendingMethod(null)
      }
    })

  const submitting = form.formState.isSubmitting

  return (
    <>
      <PageHeader
        title="Compra de Créditos"
        description={`Saldo de créditos atual: ${formatCredits(me?.creditBalance)}`}
      />

      <form noValidate onSubmit={(event) => event.preventDefault()} className="space-y-8">
        <FormError message={formError} />

        <Section title="Escolha um pacote">
          <Controller
            control={form.control}
            name="packageId"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <PackageCards
                  packages={packages.data}
                  isLoading={packages.isPending}
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  invalid={fieldState.invalid}
                  describedBy={fieldState.error ? 'pacote-erro' : undefined}
                />
                <FieldError id="pacote-erro" errors={[fieldState.error]} />
              </div>
            )}
          />
          {packages.isError && (
            <FormError message="Não foi possível carregar os pacotes. Recarregue a página." />
          )}
        </Section>

        <Section title="Dados de Faturamento">
          <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
            <FormTextField
              control={form.control}
              name="fullName"
              label="Nome completo"
              readOnly
              className="bg-muted text-muted-foreground"
            />
            <FormTextField
              control={form.control}
              name="email"
              label="E-mail"
              type="email"
              readOnly
              className="bg-muted text-muted-foreground"
            />
            <FormTextField
              control={form.control}
              name="cpf"
              label="CPF"
              mask={CPF_MASK}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
            <FormTextField
              control={form.control}
              name="phone"
              label="Telefone"
              mask={PHONE_MASKS}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Insira seu telefone"
            />
            <FormTextField
              control={form.control}
              name="cep"
              label="CEP"
              mask={CEP_MASK}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Insira seu CEP"
            />
            <FormTextField
              control={form.control}
              name="street"
              label="Endereço"
              autoComplete="address-line1"
              placeholder="Insira o endereço"
            />
            <FormTextField
              control={form.control}
              name="number"
              label="Número"
              placeholder="Insira o número"
            />
            <FormTextField
              control={form.control}
              name="complement"
              label="Complemento"
              autoComplete="address-line2"
              placeholder="Insira o complemento"
            />
            <FormTextField
              control={form.control}
              name="neighborhood"
              label="Bairro"
              placeholder="Insira o Bairro"
            />
            <FormTextField
              control={form.control}
              name="city"
              label="Cidade"
              autoComplete="address-level2"
              placeholder="Insira a Cidade"
            />
            <Controller
              control={form.control}
              name="state"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="campo-state">Estado</FieldLabel>
                  <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="campo-state"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid || undefined}
                      aria-describedby={fieldState.error ? 'campo-state-erro' : undefined}
                      className="w-full"
                    >
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf.sigla} value={uf.sigla}>
                          {uf.nome} ({uf.sigla})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="campo-state-erro" errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        </Section>

        <Section title="Formas de Pagamento">
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={submitting} onClick={(e) => void pay('PIX')(e)}>
              {pendingMethod === 'PIX' ? 'Gerando Pix…' : 'Pagar com PIX'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={(e) => void pay('MERCADO_PAGO')(e)}
            >
              {pendingMethod === 'MERCADO_PAGO' ? 'Redirecionando…' : 'Pagar com Mercado Pago'}
            </Button>
          </div>
        </Section>
      </form>

      <PixDialog payment={pixPayment} onOpenChange={(open) => !open && setPixPayment(null)} />
    </>
  )
}
