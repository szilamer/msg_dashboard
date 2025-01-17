'use client'

interface WhatsAppStats {
  totalMessages: number;
  unreadMessages: number;
  oldestUnreadMessage: string;
}

export default function WhatsAppStats({ stats }: { stats: WhatsAppStats }) {
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">WhatsApp Statisztikák</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Összes chat:</p>
          <p className="text-xl font-semibold">{stats.totalMessages}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Olvasatlan üzenetek:</p>
          <p className="text-xl font-semibold text-red-600">{stats.unreadMessages}</p>
        </div>

        {stats.oldestUnreadMessage && (
          <div>
            <p className="text-sm text-gray-600">Legrégebbi olvasatlan üzenet:</p>
            <p className="text-xl font-semibold">{stats.oldestUnreadMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
} 