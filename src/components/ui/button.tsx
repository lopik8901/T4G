import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ComponentProps } from 'react'

const variants = cva('cp-button', { variants: { variant: { default: 'cp-button-primary', outline: 'cp-button-outline', ghost: 'cp-button-ghost' }, size: { default: '', icon: 'cp-button-icon', small: 'cp-button-small' } }, defaultVariants: { variant: 'default', size: 'default' } })
// shadcn/ui's composable button pattern, adapted to CarePlay's tokens.
export function Button({ className, variant, size, asChild = false, ...props }: ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={twMerge(clsx(variants({ variant, size }), className))} {...props} />
}
