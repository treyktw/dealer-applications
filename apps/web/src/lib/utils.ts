// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine multiple class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a value as currency (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format a date in a readable format
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(dateObj)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return `${text.slice(0, length)}...`
}

/**
 * Get the initials from a name
 */
export function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

