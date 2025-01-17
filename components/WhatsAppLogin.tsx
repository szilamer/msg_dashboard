import { useState, useEffect } from 'react'
import WhatsAppStats from './WhatsAppStats'

interface WhatsAppStats {
  totalMessages: number;
  unreadMessages: number;
  oldestUnreadMessage: string;
}

export default function WhatsAppLogin({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError('')

      console.log('Adatok frissítése...')
      const response = await fetch('/api/whatsapp/check')
      const data = await response.json()
      console.log('Szerver válasz:', data)

      if (data.isLoggedIn && data.stats) {
        console.log('Sikeres frissítés!', data.stats)
        setStats(data.stats)
        onSuccess()
      } else {
        setError('Nem sikerült frissíteni az adatokat. Kérlek jelentkezz be újra.')
      }
    } catch (err) {
      console.error('Hiba a frissítés során:', err)
      setError('Hiba történt a frissítés során')
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      setStats(null)
      setCheckCount(0)

      console.log('WhatsApp bejelentkezés indítása...')
      const whatsappWindow = window.open('https://web.whatsapp.com', 'WhatsApp Web', 'width=800,height=600')
      
      if (!whatsappWindow) {
        throw new Error('Nem sikerült megnyitni a WhatsApp Web-et. Kérlek engedélyezd a felugró ablakokat.')
      }

      // Figyelünk a bejelentkezésre
      const checkLogin = setInterval(async () => {
        try {
          if (whatsappWindow.closed) {
            console.log('WhatsApp ablak bezárva')
            clearInterval(checkLogin)
            setLoading(false)
            return
          }

          setCheckCount(prev => prev + 1)
          console.log(`Bejelentkezés ellenőrzése (${checkCount + 1}. próba)...`)

          // Ellenőrizzük, hogy be van-e jelentkezve
          const response = await fetch('/api/whatsapp/check')
          const data = await response.json()
          console.log('Szerver válasz:', data)

          if (data.isLoggedIn && data.stats) {
            console.log('Sikeres bejelentkezés!', data.stats)
            clearInterval(checkLogin)
            whatsappWindow.close()
            setStats(data.stats)
            onSuccess()
            setLoading(false)
          } else if (checkCount >= 30) { // 30 próba után (1 perc) feladjuk
            console.log('Időtúllépés: nem sikerült bejelentkezni')
            clearInterval(checkLogin)
            whatsappWindow.close()
            setError('Időtúllépés: nem sikerült bejelentkezni. Kérlek próbáld újra.')
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

  // Statisztikák megjelenítése a konzolban
  useEffect(() => {
    if (stats) {
      console.log('Megjelenített statisztikák:', stats)
    }
  }, [stats])

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
            disabled={loading || refreshing}
            className={`
              w-full py-2 px-4 rounded
              ${loading || refreshing
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'}
            `}
          >
            {loading ? `Bejelentkezés folyamatban (${checkCount}. próba)...` : 'Bejelentkezés WhatsApp-ba'}
          </button>

          {stats && (
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className={`
                w-full py-2 px-4 rounded
                ${refreshing
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}
              `}
            >
              {refreshing ? 'Frissítés folyamatban...' : 'Adatok frissítése'}
            </button>
          )}
        </div>

        <p className="mt-2 text-sm text-gray-600">
          A bejelentkezéshez szkenneld be a QR kódot a WhatsApp alkalmazással.
        </p>
      </div>

      {stats && (
        <>
          <div className="text-sm text-gray-600 mb-2">
            Statisztikák sikeresen letöltve!
          </div>
          <WhatsAppStats stats={stats} />
        </>
      )}
    </div>
  )
} 