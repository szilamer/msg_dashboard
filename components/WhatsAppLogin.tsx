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
  const [error, setError] = useState('')
  const [stats, setStats] = useState<WhatsAppStats | null>(null)

  const checkWhatsAppStatus = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Adatok lekérése...')
      const response = await fetch('/api/whatsapp/check')
      const data = await response.json()
      console.log('Szerver válasz:', data)

      if (data.isLoggedIn && data.stats) {
        console.log('Sikeres adatlekérés:', data.stats)
        setStats(data.stats)
      } else {
        console.log('Nincs bejelentkezve vagy hiba történt')
        setError('Nem sikerült lekérni az adatokat. Kérlek jelentkezz be újra.')
        setStats(null)
      }
    } catch (err) {
      console.error('Hiba:', err)
      setError('Hiba történt az adatok lekérése során')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.open('https://web.whatsapp.com', 'WhatsApp Web', 'width=800,height=600')
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4">WhatsApp Bejelentkezés</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`
              w-full py-2 px-4 rounded
              ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}
            `}
          >
            Bejelentkezés WhatsApp-ba
          </button>

          <button
            onClick={checkWhatsAppStatus}
            disabled={loading}
            className={`
              w-full py-2 px-4 rounded
              ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}
            `}
          >
            {loading ? 'Adatok lekérése...' : 'Adatok frissítése'}
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          1. Kattints a "Bejelentkezés WhatsApp-ba" gombra<br />
          2. Olvasd be a QR kódot a telefonoddal<br />
          3. Kattints az "Adatok frissítése" gombra
        </p>
      </div>

      {stats && <WhatsAppStats stats={stats} />}
    </div>
  )
} 