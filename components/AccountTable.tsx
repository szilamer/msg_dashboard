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

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts')
        const data = await response.json()
        setAccounts(data)
      } catch (error) {
        console.error('Hiba:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [refreshTrigger])

  if (loading) return <div>Betöltés...</div>

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