import type { ComponentProps, ReactNode } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'

import { MaskedInput, type MaskMask } from './MaskedInput'
import { PasswordInput } from './PasswordInput'

type FormTextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  description?: ReactNode
  /** Quando informada, usa o react-imask. */
  mask?: MaskMask
} & Omit<ComponentProps<'input'>, 'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'>

/** Campo de texto ligado ao React Hook Form, com label, descrição e erro acessíveis. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  mask,
  id,
  ...inputProps
}: FormTextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const inputId = id ?? `campo-${name.replace(/\./g, '-')}`
  const descriptionId = description ? `${inputId}-descricao` : undefined
  const errorId = fieldState.error ? `${inputId}-erro` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  const common = {
    ...inputProps,
    id: inputId,
    name: field.name,
    ref: field.ref,
    onBlur: field.onBlur,
    disabled: field.disabled ?? inputProps.disabled,
    'aria-invalid': fieldState.invalid || undefined,
    'aria-describedby': describedBy,
  }
  const value = typeof field.value === 'string' ? field.value : ''

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {mask ? (
        <MaskedInput {...common} mask={mask} value={value} onValueChange={field.onChange} />
      ) : inputProps.type === 'password' ? (
        <PasswordInput {...common} value={value} onChange={field.onChange} />
      ) : (
        <Input {...common} value={value} onChange={field.onChange} />
      )}
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      <FieldError id={errorId} errors={[fieldState.error]} />
    </Field>
  )
}
