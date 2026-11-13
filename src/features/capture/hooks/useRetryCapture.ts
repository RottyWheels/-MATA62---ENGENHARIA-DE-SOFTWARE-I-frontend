import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { getErrorMessage } from '@/shared/api/problem-detail'

import { useCreateCapture } from '../api/capture'
import type { Capture } from '../api/types'

/**
 * "Tentar novamente": abre uma sessão nova com o mesmo título e URL, no lugar
 * da que falhou (o voltar do navegador não leva para a sessão com erro).
 */
export function useRetryCapture(capture: Pick<Capture, 'title' | 'url'>) {
  const navigate = useNavigate()
  const create = useCreateCapture()

  const retry = async () => {
    try {
      const next = await create.mutateAsync({ title: capture.title, url: capture.url })
      await navigate(`/capturas/${next.id}/sessao`, { replace: true })
    } catch (error) {
      toast.error('Não foi possível tentar de novo', { description: getErrorMessage(error) })
    }
  }

  return { retry, pending: create.isPending }
}
