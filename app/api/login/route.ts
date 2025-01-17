import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Singleton PrismaClient instance
const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json()
    
    if (!platform) {
      return NextResponse.json(
        { error: 'A platform megadása kötelező' },
        { status: 400 }
      )
    }

    // Szimulált adatok (később valós adatokkal helyettesítendő)
    const mockData = {
      username: `${platform}User`,
      totalMessages: Math.floor(Math.random() * 100),
      unreadMessages: Math.floor(Math.random() * 20),
      oldestUnreadMessage: new Date().toISOString()
    }

    try {
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
          oldestUnreadMessage: mockData.oldestUnreadMessage,
          lastUpdated: new Date()
        }
      })

      return NextResponse.json({ 
        success: true,
        message: 'Sikeres bejelentkezés',
        data: {
          platform,
          username: mockData.username
        }
      })
    } catch (dbError) {
      console.error('Adatbázis hiba:', dbError)
      return NextResponse.json(
        { error: 'Adatbázis hiba történt' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a bejelentkezés során' },
      { status: 500 }
    )
  }
} 