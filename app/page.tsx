'use client'
import { useState } from 'react'
import WhatsAppLogin from '@/components/WhatsAppLogin'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Chat Fiók Összesítő</h1>
      
      <div className="mb-8">
        <WhatsAppLogin />
      </div>
    </main>
  )
} 