import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { useMe } from '@/features/auth'
import { applyProblemDetailToForm, getProblemDetail } from '@/shared/api/problem-detail'
import { FormError } from '@/shared/components/form/FormError'
import { FormTextField } from '@/shared/components/form/FormTextField'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { Button } from '@/shared/components/ui/button'

import { INSUFFICIENT_CREDITS, useCapturePrice, useCreateCapture } from '../api/capture'
import { CaptureCostNotice } from '../components/CaptureCostNotice'
import {
  CAPTURE_TITLE_MAX_LENGTH,
  newCaptureDefaultValues,
  newCaptureSchema,
  toCreateCaptureRequest,
  type NewCaptureFormValues,
} from '../schemas/capture'

/** Novo Registro (REQ 08): Figma "Criar Novo Registro", estado inicial. */
export function NewCapturePage() {
  const navigate = useNavigate()
  const me = useMe()
  const price = useCapturePrice()
  const create = useCreateCapture()
  const [formError, setFormError] = useState<string | null>(null)
  // O backend é quem decide: um 402 vale mesmo que o saldo na tela pareça suficiente.
  const [rejectedForBalance, setRejectedForBalance] = useState(false)

  const form = useForm<NewCaptureFormValues>({
    resolver: zodResolver(newCaptureSchema),
    defaultValues: newCaptureDefaultValues,
  })

  const cost = price.data?.creditsPerRecord
  const balance = me.data?.creditBalance
  const insufficient =
    rejectedForBalance || (cost !== undefined && balance !== undefined && balance < cost)

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const capture = await create.mutateAsync(toCreateCaptureRequest(values))
      await navigate(`/capturas/${capture.id}/sessao`)
    } catch (error) {
      if (getProblemDetail(error)?.code === INSUFFICIENT_CREDITS) {
        setRejectedForBalance(true)
        return
      }
      setFormError(applyProblemDetailToForm(error, form.setError))
    }
  })

  return (
    <>
      <PageHeader
        title="Iniciar Registro de Conteúdo"
        description="Preencha os dados abaixo para iniciar um novo registro"
      />

      <form onSubmit={onSubmit} noValidate className="flex max-w-5xl flex-col gap-8">
        <FormError message={formError} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormTextField
            control={form.control}
            name="title"
            label="Título do Registro"
            placeholder="Insira o título"
            maxLength={CAPTURE_TITLE_MAX_LENGTH}
            description="Aparece na lista e no relatório. Ex.: Anúncio do imóvel da Rua das Flores."
          />
          <FormTextField
            control={form.control}
            name="url"
            label="URL do site"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://"
            className="font-mono"
            description="Endereço completo da página, começando com https://"
          />
        </div>

        <CaptureCostNotice
          cost={cost}
          costLoading={price.isPending}
          balance={balance}
          insufficient={insufficient}
        />

        <section
          aria-labelledby="como-funciona"
          className="flex flex-col gap-3 rounded-lg border p-5"
        >
          <h2 id="como-funciona" className="text-base font-semibold">
            Como funciona
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
            <li>O site abre num navegador seguro do Veridt, dentro desta tela.</li>
            <li>
              Navegue até o conteúdo. Use <strong className="text-foreground">Capturar Tela</strong>{' '}
              para registrar imagens e <strong className="text-foreground">Iniciar Gravação</strong>{' '}
              para registrar um vídeo da navegação.
            </li>
            <li>
              Ao concluir, cada arquivo recebe um hash SHA-256 e você é avisado por e-mail quando o
              relatório estiver pronto.
            </li>
          </ol>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={insufficient || form.formState.isSubmitting}
            aria-describedby={insufficient ? 'sem-saldo' : undefined}
          >
            {form.formState.isSubmitting ? 'Abrindo o site…' : 'Iniciar Registro'}
          </Button>
          {insufficient && (
            <span id="sem-saldo" className="text-sm text-muted-foreground">
              Disponível quando houver créditos suficientes.
            </span>
          )}
        </div>
      </form>
    </>
  )
}
