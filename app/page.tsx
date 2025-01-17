'use client'
import { useState } from 'react'
import AccountTable from '@/components/AccountTable'
import LoginForm from '@/components/LoginForm'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Chat Fiók Összesítő</h1>
      
      <div className="mb-8">
        <LoginForm onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
      </div>

      <AccountTable refreshTrigger={refreshTrigger} />
    </main>
  )
} 