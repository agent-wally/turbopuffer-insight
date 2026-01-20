import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number | undefined | null, decimals = 2): string {
  if (bytes == null || isNaN(bytes)) return '—'
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatNumber(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return '—'
  return new Intl.NumberFormat().format(num)
}

export function formatDate(date: string | Date | undefined | null): string {
  if (date == null) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  } catch {
    return '—'
  }
}

export function truncate(str: string | undefined | null, length: number): string {
  if (str == null) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
