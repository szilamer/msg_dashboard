'use client'
import { useState, FormEvent } from 'react'

interface LoginFormProps {
  onSuccess: () => void
}

interface PlatformConfig {
  name: string
  url: string
}

const platformConfigs: { [key: string]: PlatformConfig } = {
  whatsapp: {
    name: 'WhatsApp',
    url: 'https://web.whatsapp.com'
  },
  skype: {
    name: 'Skype',
    url: 'https://web.skype.com'
  },
  messenger: {
    name: 'Messenger',
    url: 'https://www.messenger.com'
  }
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [platform, setPlatform] = useState('whatsapp')
  const [loading, setLoading] = useState(false)
  const [checkingData, setCheckingData] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const openPlatformLogin = () => {
    const config = platformConfigs[platform]
    const width = 1200
    const height = 800
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    window.open(
      config.url,
      `${config.name} Bejelentkezés`,
      `width=${width},height=${height},left=${left},top=${top}`
    )

    // Jelezzük a felhasználónak, hogy mit kell tennie
    alert('Kérjük, jelentkezzen be a megnyíló WhatsApp ablakban. Ha bejelentkezett, térjen vissza ide és kattintson az "Adatok beolvasása" gombra.')
    setIsLoggedIn(true)
  }

  const checkAndSendData = async () => {
    try {
      setCheckingData(true)
      
      // Itt később implementáljuk az adatok kinyerését
      // Egyelőre csak szimulált adatokat küldünk
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          username: 'user',
          totalMessages: Math.floor(Math.random() * 100),
          unreadMessages: Math.floor(Math.random() * 20),
          oldestUnreadMessage: new Date().toISOString()
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        throw new Error('Hiba történt az adatok mentése során')
      }
    } catch (error) {
      console.error('Hiba:', error)
      alert('Hiba történt az adatok mentése során')
    } finally {
      setCheckingData(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    openPlatformLogin()
    setLoading(false)
  }

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto bg-white rounded-lg shadow">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium">Válassza ki a platformot:</label>
          <select 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full border p-2 rounded"
            disabled={isLoggedIn}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="skype">Skype</option>
            <option value="messenger">Messenger</option>
          </select>
        </div>

        {!isLoggedIn ? (
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Betöltés...' : 'Bejelentkezés megnyitása'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Kérjük, jelentkezzen be a megnyitott {platformConfigs[platform].name} ablakban. 
                Ha bejelentkezett, kattintson az "Adatok beolvasása" gombra.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsLoggedIn(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Vissza
              </button>
              
              <button
                type="button"
                onClick={checkAndSendData}
                disabled={checkingData}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {checkingData ? 'Adatok beolvasása...' : 'Adatok beolvasása'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
} 