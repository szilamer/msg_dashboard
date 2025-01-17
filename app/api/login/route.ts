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
      // Először ellenőrizzük, hogy létezik-e már a fiók
      const existingAccount = await prisma.account.findFirst({
        where: {
          platform: platform,
          username: mockData.username
        }
      })

      let account;
      if (existingAccount) {
        // Ha létezik, frissítjük
        account = await prisma.account.update({
          where: {
            id: existingAccount.id
          },
          data: {
            totalMessages: mockData.totalMessages,
            unreadMessages: mockData.unreadMessages,
            oldestUnreadMessage: mockData.oldestUnreadMessage,
            lastUpdated: new Date()
          }
        })
      } else {
        // Ha nem létezik, létrehozzuk
        account = await prisma.account.create({
          data: {
            platform: platform,
            username: mockData.username,
            totalMessages: mockData.totalMessages,
            unreadMessages: mockData.unreadMessages,
            oldestUnreadMessage: mockData.oldestUnreadMessage,
            lastUpdated: new Date()
          }
        })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Sikeres bejelentkezés',
        data: {
          id: account.id,
          platform: account.platform,
          username: account.username
        }
      })
    } catch (dbError) {
      console.error('Adatbázis hiba:', dbError)
      return NextResponse.json(
        { error: 'Adatbázis hiba történt: ' + (dbError as Error).message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a bejelentkezés során: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 