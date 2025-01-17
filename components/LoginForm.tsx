'use client'
import { useState, FormEvent } from 'react'

interface LoginFormProps {
  onSuccess: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [platform, setPlatform] = useState('whatsapp')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })

      if (!response.ok) throw new Error('Bejelentkezési hiba')
      
      onSuccess()
    } catch (error) {
      console.error('Hiba:', error)
      alert('Hiba történt a bejelentkezés során')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block mb-2">Platform:</label>
        <select 
          value={platform} 
          onChange={(e) => setPlatform(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="skype">Skype</option>
          <option value="messenger">Messenger</option>
        </select>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
      </button>
    </form>
  )
} 