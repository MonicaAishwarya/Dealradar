import { clsx } from 'clsx'
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  label?: string
  error?: string
}

export function Input({ leftIcon, rightIcon, label, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          className={clsx(
            'w-full border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
            leftIcon ? 'pl-9' : 'pl-3',
            rightIcon ? 'pr-9' : 'pr-3',
            'py-2',
            error && 'border-red-300 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <select
        className={clsx(
          'w-full border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <textarea
        className={clsx(
          'w-full border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none',
          error && 'border-red-300',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
