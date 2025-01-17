'use client'
import { useState } from 'react'
import WhatsAppStats from './WhatsAppStats'

interface WhatsAppStats {
  totalMessages: number
  unreadMessages: number
  oldestUnreadMessage: string
}

export default function WhatsAppLogin() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<WhatsAppStats | null>(null)

  const handleCheck = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/whatsapp/check')
      const data = await response.json()
      
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Hiba:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4">WhatsApp Adatok</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleCheck}
            disabled={loading}
            className={`
              w-full py-2 px-4 rounded
              ${loading ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'} 
              text-white
            `}
          >
            {loading ? 'Betöltés...' : 'Adatok lekérése'}
          </button>
        </div>
      </div>

      {stats && <WhatsAppStats stats={stats} />}
    </div>
  )
} 