"use client"

import React from 'react'
import { AppError, ErrorType } from '@/lib/types/errors'
import AuthenticationRequired from './AuthenticationRequired'

type Props = {
  error: AppError
}

export default function ErrorDisplay({ error }: Props) {
  if (error.type === ErrorType.AUTH) {
    return <AuthenticationRequired message={error.message} />
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-white rounded border p-6">
        <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-gray-700 mb-4">{error.message}</p>
        {process.env.NODE_ENV !== 'production' && (
          <details className="text-sm text-gray-500">
            <summary>詳細</summary>
            <pre className="whitespace-pre-wrap break-all">
{JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
