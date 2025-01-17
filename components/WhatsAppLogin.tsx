'use client'
import { useState } from 'react'

interface Props {
  onFetchStats: () => void;
}

export default function WhatsAppLogin({ onFetchStats }: Props) {
  const [loading, setLoading] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  const handleLogin = () => {
    setShowWhatsApp(true)
  }

  const handleCheck = async () => {
    try {
      setLoading(true)
      
      // Küldjük el az adatokat a szervernek
      const response = await fetch('/api/whatsapp/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalMessages: 10, // Teszt adat
          unreadMessages: 5, // Teszt adat
          oldestUnreadMessage: '10:30' // Teszt adat
        }),
      })

      if (!response.ok) {
        throw new Error('Hiba történt a szerver válaszában')
      }

      // Frissítsük a megjelenített adatokat
      onFetchStats()
    } catch (error) {
      console.error('Hiba:', error)
      alert('Nem sikerült lekérni az adatokat. Kérlek ellenőrizd, hogy be vagy-e jelentkezve a WhatsApp Web-be!')
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

      {showWhatsApp && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">WhatsApp Web</h3>
              <button
                onClick={() => setShowWhatsApp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Bezárás
              </button>
            </div>
            <div className="h-[600px]">
              <iframe
                src="https://web.whatsapp.com"
                className="w-full h-full"
                allow="camera;microphone"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 