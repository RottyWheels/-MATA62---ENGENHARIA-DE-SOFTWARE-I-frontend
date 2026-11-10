import type { ComponentProps, ComponentType, Ref } from 'react'
import { IMaskMixin } from 'react-imask'

import { Input } from '@/shared/components/ui/input'

type BaseProps = ComponentProps<'input'> & { inputRef?: Ref<HTMLInputElement> }

// O react-imask controla o <input>; o visual continua sendo o Input do shadcn.
const MaskedInputBase = IMaskMixin(({ inputRef, ...props }: BaseProps) => (
  <Input ref={inputRef} {...props} />
)) as unknown as ComponentType<
  Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
    mask: unknown
    value: string
    onAccept: (value: string) => void
    inputRef?: Ref<HTMLInputElement>
  }
>

export type MaskMask = string | ReadonlyArray<{ mask: string }>

export type MaskedInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'ref'
> & {
  /** Máscara do imask (`0` = dígito). Um array ativa a máscara dinâmica. */
  mask: MaskMask
  value: string
  onValueChange: (value: string) => void
  ref?: Ref<HTMLInputElement>
}

/** Campo com máscara. O valor exposto é o texto mascarado (ex.: `529.982.247-25`). */
export function MaskedInput({ mask, value, onValueChange, ref, ...props }: MaskedInputProps) {
  return (
    <MaskedInputBase
      {...props}
      mask={Array.isArray(mask) ? [...mask] : mask}
      value={value}
      onAccept={onValueChange}
      inputRef={ref}
    />
  )
}
