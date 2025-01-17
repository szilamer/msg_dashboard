'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  onFetchStats: () => void;
}

export default function WhatsAppLogin({ onFetchStats }: Props) {
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const whatsappWindow = useRef<Window | null>(null)
  const checkInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Ellenőrizzük, hogy be van-e jelentkezve
    const checkLoginStatus = () => {
      if (whatsappWindow.current && !whatsappWindow.current.closed) {
        try {
          const url = whatsappWindow.current.location.href
          if (url.includes('web.whatsapp.com') && !url.includes('/accept')) {
            setIsLoggedIn(true)
            if (checkInterval.current) {
              clearInterval(checkInterval.current)
            }
          }
        } catch (error) {
          // CORS hiba esetén nem tudunk hozzáférni a location.href-hez
          // de ez nem baj, folytatjuk az ellenőrzést
        }
      }
    }

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current)
      }
    }
  }, [])

  const handleLogin = () => {
    // Új ablak nyitása
    whatsappWindow.current = window.open(
      'https://web.whatsapp.com',
      'WhatsApp Web',
      'width=1000,height=800,top=50,left=50'
    )

    // Ellenőrzés indítása
    if (checkInterval.current) {
      clearInterval(checkInterval.current)
    }
    checkInterval.current = setInterval(() => {
      if (whatsappWindow.current && whatsappWindow.current.closed) {
        if (checkInterval.current) {
          clearInterval(checkInterval.current)
        }
      }
    }, 1000)
  }

  const handleCheck = async () => {
    try {
      setLoading(true)

      // Teszt adatok küldése
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
            {isLoggedIn ? 'WhatsApp Web megnyitása' : 'Bejelentkezés WhatsApp-ba'}
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
    </div>
  )
} 