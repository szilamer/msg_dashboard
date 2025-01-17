import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { totalMessages, unreadMessages, oldestUnreadMessage } = data

    // Frissítjük vagy létrehozzuk a WhatsApp fiók adatait
    const account = await prisma.account.upsert({
      where: {
        platform_username: {
          platform: 'whatsapp',
          username: 'default'
        }
      },
      update: {
        totalMessages,
        unreadMessages,
        oldestUnreadMessage,
        lastUpdated: new Date()
      },
      create: {
        platform: 'whatsapp',
        username: 'default',
        totalMessages,
        unreadMessages,
        oldestUnreadMessage,
        lastUpdated: new Date()
      }
    })

    return NextResponse.json({ success: true, account })
  } catch (error: any) {
    console.error('Hiba történt:', error)
    return NextResponse.json({ error: 'Nem sikerült menteni az adatokat', details: error.message })
  }
} 