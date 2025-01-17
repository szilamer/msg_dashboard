'use client'
import { useEffect, useState } from 'react'

interface Account {
  id: string
  platform: string
  username: string
  totalMessages: number
  unreadMessages: number
  oldestUnreadMessage: string | null
  lastUpdated: string
}

interface AccountTableProps {
  refreshTrigger: number
}

export default function AccountTable({ refreshTrigger }: AccountTableProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/accounts')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Ellenőrizzük, hogy az adat tömb-e
        if (!Array.isArray(data)) {
          throw new Error('Az API nem tömb formátumban küldte vissza az adatokat')
        }
        
        // Validáljuk az adatokat
        const validatedAccounts = data.map((account: any) => ({
          id: account.id?.toString() || '',
          platform: account.platform || '',
          username: account.username || '',
          totalMessages: Number(account.totalMessages) || 0,
          unreadMessages: Number(account.unreadMessages) || 0,
          oldestUnreadMessage: account.oldestUnreadMessage || null,
          lastUpdated: account.lastUpdated || new Date().toISOString()
        }))
        
        setAccounts(validatedAccounts)
      } catch (error) {
        console.error('Hiba:', error)
        setError(error instanceof Error ? error.message : 'Ismeretlen hiba történt')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [refreshTrigger])

  if (loading) return <div className="p-4 text-center">Betöltés...</div>
  if (error) return <div className="p-4 text-center text-red-500">Hiba történt: {error}</div>
  if (accounts.length === 0) return <div className="p-4 text-center">Nincs megjeleníthető adat</div>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Platform</th>
            <th className="px-4 py-2">Felhasználónév</th>
            <th className="px-4 py-2">Összes üzenet</th>
            <th className="px-4 py-2">Olvasatlan üzenetek</th>
            <th className="px-4 py-2">Legrégebbi olvasatlan</th>
            <th className="px-4 py-2">Utolsó frissítés</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b">
              <td className="px-4 py-2">{account.platform}</td>
              <td className="px-4 py-2">{account.username}</td>
              <td className="px-4 py-2">{account.totalMessages}</td>
              <td className="px-4 py-2">{account.unreadMessages}</td>
              <td className="px-4 py-2">
                {account.oldestUnreadMessage 
                  ? new Date(account.oldestUnreadMessage).toLocaleDateString() 
                  : '-'}
              </td>
              <td className="px-4 py-2">
                {new Date(account.lastUpdated).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 