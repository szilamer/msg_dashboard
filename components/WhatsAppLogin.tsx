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

  const handleLogin = () => {
    window.open('https://web.whatsapp.com', 'WhatsApp Web', 'width=800,height=600')
  }

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
        <h2 className="text-lg font-semibold mb-4">WhatsApp Bejelentkezés</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`
              w-full py-2 px-4 rounded
              ${loading ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'} 
              text-white
            `}
          >
            Bejelentkezés WhatsApp-ba
          </button>

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

          <p className="text-sm text-gray-600">
            1. Kattints a "Bejelentkezés WhatsApp-ba" gombra<br />
            2. Olvasd be a QR kódot a telefonoddal<br />
            3. Kattints az "Adatok lekérése" gombra
          </p>
        </div>
      </div>

      {stats && <WhatsAppStats stats={stats} />}
    </div>
  )
} 