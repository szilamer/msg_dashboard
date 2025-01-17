'use client'
import { useState, FormEvent, useEffect } from 'react'

interface LoginFormProps {
  onSuccess: () => void
}

interface PlatformConfig {
  name: string
  url: string
  selector: {
    totalMessages: string
    unreadMessages: string
    oldestUnread: string
  }
}

const platformConfigs: { [key: string]: PlatformConfig } = {
  whatsapp: {
    name: 'WhatsApp',
    url: 'https://web.whatsapp.com',
    selector: {
      totalMessages: '[data-testid="chat-list"] [role="listitem"]',
      unreadMessages: '[data-testid="chat-list"] [aria-label*="unread message"]',
      oldestUnread: '[data-testid="chat-list"] [aria-label*="unread message"]:first-child time'
    }
  },
  skype: {
    name: 'Skype',
    url: 'https://web.skype.com',
    selector: {
      totalMessages: '.conversationsList .conversation',
      unreadMessages: '.conversationsList .conversation.unread',
      oldestUnread: '.conversationsList .conversation.unread:first-child .time'
    }
  },
  messenger: {
    name: 'Messenger',
    url: 'https://www.messenger.com',
    selector: {
      totalMessages: '[role="navigation"] [role="row"]',
      unreadMessages: '[role="navigation"] [role="row"] [aria-label*="unread"]',
      oldestUnread: '[role="navigation"] [role="row"] [aria-label*="unread"]:first-child time'
    }
  }
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [platform, setPlatform] = useState('whatsapp')
  const [loading, setLoading] = useState(false)
  const [showPlatform, setShowPlatform] = useState(false)
  const [checkingData, setCheckingData] = useState(false)

  // Adatok ellenőrzése és küldése
  const checkAndSendData = async () => {
    try {
      setCheckingData(true)
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          username: 'user', // Ez majd a bejelentkezett felhasználó neve lesz
          totalMessages: Math.floor(Math.random() * 100), // Ezt majd a DOM-ból olvassuk ki
          unreadMessages: Math.floor(Math.random() * 20), // Ezt majd a DOM-ból olvassuk ki
          oldestUnreadMessage: new Date().toISOString() // Ezt majd a DOM-ból olvassuk ki
        })
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Hiba az adatok mentése során:', error)
      alert('Hiba történt az adatok mentése során')
    } finally {
      setCheckingData(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setShowPlatform(true)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block mb-2">Platform:</label>
          <select 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value)}
            className="border p-2 rounded"
            disabled={showPlatform}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="skype">Skype</option>
            <option value="messenger">Messenger</option>
          </select>
        </div>

        {!showPlatform && (
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Betöltés...' : 'Bejelentkezés'}
          </button>
        )}
      </form>

      {showPlatform && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <iframe 
              src={platformConfigs[platform].url}
              className="w-full h-full"
              title={`${platformConfigs[platform].name} bejelentkezés`}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setShowPlatform(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Vissza
            </button>
            
            <button
              onClick={checkAndSendData}
              disabled={checkingData}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {checkingData ? 'Adatok ellenőrzése...' : 'Adatok mentése'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 