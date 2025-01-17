'use client'
import { useState } from 'react'
import WhatsAppLogin from '@/components/WhatsAppLogin'
import AccountTable from '@/components/AccountTable'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Chat Fiók Összesítő</h1>
      
      <div className="mb-8">
        <WhatsAppLogin onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
      </div>

      <AccountTable refreshTrigger={refreshTrigger} />
    </main>
  )
} 