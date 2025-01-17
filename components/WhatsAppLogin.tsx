'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  onFetchStats: () => void;
}

export default function WhatsAppLogin({ onFetchStats }: Props) {
  const [loading, setLoading] = useState(false)
  const [whatsappWindow, setWhatsappWindow] = useState<Window | null>(null)
  const checkInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current)
      }
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close()
      }
    }
  }, [whatsappWindow])

  const handleLogin = () => {
    const newWindow = window.open('https://web.whatsapp.com', 'WhatsApp Web', 'width=800,height=600')
    if (newWindow) {
      setWhatsappWindow(newWindow)
    }
  }

  const extractWhatsAppData = async () => {
    if (!whatsappWindow || whatsappWindow.closed) {
      throw new Error('A WhatsApp ablak nincs megnyitva vagy be van zárva')
    }

    return new Promise<{
      totalMessages: number;
      unreadMessages: number;
      oldestUnreadMessage: string;
    }>((resolve, reject) => {
      try {
        const script = `
          const totalChats = document.querySelectorAll('div[data-testid="chat-list"] > div').length;
          const unreadChats = document.querySelectorAll('div[data-testid="chat-list"] span[data-testid*="unread"]');
          const unreadCount = Array.from(unreadChats).reduce((sum, span) => {
            const count = parseInt(span.textContent || '0', 10);
            return sum + (isNaN(count) ? 1 : count);
          }, 0);

          let oldestUnread = '';
          if (unreadChats.length > 0) {
            const firstUnreadChat = unreadChats[0].closest('div[data-testid="cell-frame-container"]');
            const timeElement = firstUnreadChat?.querySelector('span[data-testid*="last-msg-time"]');
            oldestUnread = timeElement?.textContent || '';
          }

          ({
            totalMessages: totalChats,
            unreadMessages: unreadCount,
            oldestUnreadMessage: oldestUnread
          });
        `

        // @ts-ignore
        const data = whatsappWindow.eval(script)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleCheck = async () => {
    try {
      setLoading(true)

      // Próbáljuk meg kinyerni az adatokat
      const data = await extractWhatsAppData()

      // Küldjük el az adatokat a szervernek
      const response = await fetch('/api/whatsapp/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
    </div>
  )
} 