import { cn } from '@/shared/lib/utils'

import type { RecordStatus } from '../api/types'
import { RECORD_STATUS_CLASS, RECORD_STATUS_LABEL } from '../lib/status'

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        RECORD_STATUS_CLASS[status],
      )}
    >
      {RECORD_STATUS_LABEL[status]}
    </span>
  )
}
