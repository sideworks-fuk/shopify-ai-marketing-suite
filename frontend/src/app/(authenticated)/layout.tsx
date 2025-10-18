import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 簡易認証チェック（本番のみ有効化）
  // Clerk等への移行は後続タスク
  if (process.env.NODE_ENV === 'production') {
    const token = cookies().get('authToken')?.value;
    if (!token) {
      redirect('/install');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}