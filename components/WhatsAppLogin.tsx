import { useState } from 'react'

export default function WhatsAppLogin({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      // Megnyitjuk a WhatsApp Web-et egy új ablakban
      const whatsappWindow = window.open('https://web.whatsapp.com', 'WhatsApp Web', 'width=800,height=600')
      
      if (!whatsappWindow) {
        throw new Error('Nem sikerült megnyitni a WhatsApp Web-et. Kérlek engedélyezd a felugró ablakokat.')
      }

      // Figyelünk a bejelentkezésre
      const checkLogin = setInterval(async () => {
        try {
          if (whatsappWindow.closed) {
            clearInterval(checkLogin)
            setLoading(false)
            return
          }

          // Ellenőrizzük, hogy be van-e jelentkezve
          const response = await fetch('/api/whatsapp/check')
          const data = await response.json()

          if (data.isLoggedIn) {
            clearInterval(checkLogin)
            whatsappWindow.close()
            onSuccess()
            setLoading(false)
          }
        } catch (err) {
          console.error('Hiba a bejelentkezés ellenőrzésekor:', err)
        }
      }, 2000)

    } catch (err) {
      console.error('Hiba a bejelentkezés során:', err)
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">WhatsApp Bejelentkezés</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className={`
          w-full py-2 px-4 rounded
          ${loading 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600 text-white'}
        `}
      >
        {loading ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés WhatsApp-ba'}
      </button>

      <p className="mt-2 text-sm text-gray-600">
        A bejelentkezéshez szkenneld be a QR kódot a WhatsApp alkalmazással.
      </p>
    </div>
  )
} 