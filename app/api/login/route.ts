import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client/edge'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json()
    
    // Szimulált adatok (később valós adatokkal helyettesítendő)
    const mockData = {
      username: `${platform}User`,
      totalMessages: Math.floor(Math.random() * 100),
      unreadMessages: Math.floor(Math.random() * 20),
      oldestUnreadMessage: new Date().toISOString()
    }

    // Adatok mentése az adatbázisba
    await prisma.account.upsert({
      where: {
        platform_username: {
          platform,
          username: mockData.username
        }
      },
      update: {
        totalMessages: mockData.totalMessages,
        unreadMessages: mockData.unreadMessages,
        oldestUnreadMessage: mockData.oldestUnreadMessage,
        lastUpdated: new Date()
      },
      create: {
        platform,
        username: mockData.username,
        totalMessages: mockData.totalMessages,
        unreadMessages: mockData.unreadMessages,
        oldestUnreadMessage: mockData.oldestUnreadMessage
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a bejelentkezés során' },
      { status: 500 }
    )
  }
} 