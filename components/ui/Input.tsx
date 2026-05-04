import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const labelClass = 'block text-sm font-medium text-charcoal-500 mb-1'
const fieldClass =
  'w-full px-4 py-2 border rounded-lg bg-champagne-50 text-charcoal-900 placeholder:text-charcoal-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ' +
  'disabled:bg-champagne-200 disabled:text-charcoal-300 disabled:cursor-not-allowed'
const errorClass = 'mt-1 text-sm text-rose-700'
const helperClass = 'mt-1 text-sm text-charcoal-500'

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (props.name ? `input-${props.name}` : undefined)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          ${fieldClass}
          ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-champagne-200'}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className={errorClass}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className={helperClass}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || (props.name ? `textarea-${props.name}` : undefined)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          ${fieldClass}
          ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-champagne-200'}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className={errorClass}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className={helperClass}>
          {helperText}
        </p>
      )}
    </div>
  )
}
