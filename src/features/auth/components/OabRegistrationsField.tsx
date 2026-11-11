import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Controller, useFieldArray, type Control, type FieldErrors } from 'react-hook-form'

import { FormTextField } from '@/shared/components/form/FormTextField'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

import {
  emptyOabRegistration,
  OAB_MAX_REGISTRATIONS,
  OAB_REGISTRATION_TYPE_LABELS,
  OAB_REGISTRATION_TYPES,
  type RegisterFormValues,
} from '../schemas/auth'

type Props = {
  control: Control<RegisterFormValues>
  errors: FieldErrors<RegisterFormValues>
}

/**
 * Inscrições na OAB do advogado (o backend aceita várias: principal, suplementares
 * e de estagiário). Cada número segue o formato `000000/UF` do Figma.
 */
export function OabRegistrationsField({ control, errors }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'oabRegistrations' })
  const listError = errors.oabRegistrations?.root ?? errors.oabRegistrations
  const listErrorMessage = typeof listError?.message === 'string' ? listError.message : undefined

  const addRegistration = () => {
    // A primeira costuma ser a principal; as seguintes, suplementares.
    append(emptyOabRegistration(fields.length === 0 ? 'PRINCIPAL' : 'SUPLEMENTAR'), {
      shouldFocus: true,
    })
  }

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Inscrições na OAB</FieldLegend>

      <ul className="flex flex-col gap-3">
        {fields.map((item, index) => {
          const position = index + 1
          const first = index === 0
          const typeId = `campo-oabRegistrations-${index}-type`
          return (
            <li key={item.id} className="grid grid-cols-[1fr_8.5rem_auto] items-start gap-2">
              <FormTextField
                control={control}
                name={`oabRegistrations.${index}.oab`}
                label={first ? 'Número da OAB' : `Número da OAB, inscrição ${position}`}
                hideLabel={!first}
                placeholder="000000/UF"
                autoCapitalize="characters"
                maxLength={9}
              />
              <Controller
                control={control}
                name={`oabRegistrations.${index}.type`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={typeId} className={first ? undefined : 'sr-only'}>
                      {first ? 'Tipo' : `Tipo da inscrição ${position}`}
                    </FieldLabel>
                    <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id={typeId}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        className="w-full"
                        aria-invalid={fieldState.invalid || undefined}
                        aria-describedby={fieldState.error ? `${typeId}-erro` : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OAB_REGISTRATION_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {OAB_REGISTRATION_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError id={`${typeId}-erro`} errors={[fieldState.error]} />
                  </Field>
                )}
              />
              {/* A primeira linha não tem botão de remover: advogado precisa de ao menos uma. */}
              <div className={first ? 'w-8' : undefined}>
                {!first && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover inscrição ${position}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {listErrorMessage && <FieldError>{listErrorMessage}</FieldError>}

      {fields.length < OAB_MAX_REGISTRATIONS && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit px-1 text-primary hover:text-primary"
          onClick={addRegistration}
        >
          <PlusIcon />
          Adicionar inscrição
        </Button>
      )}
    </FieldSet>
  )
}
