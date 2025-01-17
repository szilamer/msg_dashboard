'use client'
import { useState, useEffect } from 'react'
import WhatsAppLogin from '@/components/WhatsAppLogin'
import WhatsAppStats from '@/components/WhatsAppStats'

export default function Home() {
  const [whatsAppStats, setWhatsAppStats] = useState({
    totalMessages: 0,
    unreadMessages: 0,
    oldestUnreadMessage: ''
  });

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/accounts?platform=whatsapp');
      const data = await response.json();
      if (data.account) {
        setWhatsAppStats({
          totalMessages: data.account.totalMessages,
          unreadMessages: data.account.unreadMessages,
          oldestUnreadMessage: data.account.oldestUnreadMessage
        });
      }
    } catch (error) {
      console.error('Hiba történt az adatok lekérése közben:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Chat Fiók Összesítő</h1>
      
      <div className="mb-8">
        <WhatsAppLogin onFetchStats={fetchStats} />
      </div>

      <div className="mb-8">
        <WhatsAppStats stats={whatsAppStats} />
      </div>
    </main>
  )
} 