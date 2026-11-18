import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind class merger — same convention as the rest of the baref00t stack. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
