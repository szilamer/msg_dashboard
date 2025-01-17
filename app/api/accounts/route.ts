import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Singleton PrismaClient instance
const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        platform: true,
        username: true,
        totalMessages: true,
        unreadMessages: true,
        oldestUnreadMessage: true,
        lastUpdated: true
      }
    })

    // Ha nincsenek fiókok, üres tömböt küldünk vissza
    if (!accounts || accounts.length === 0) {
      return NextResponse.json([])
    }

    // Átalakítjuk az adatokat a frontend által várt formátumra
    const formattedAccounts = accounts.map(account => ({
      id: account.id.toString(),
      platform: account.platform || '',
      username: account.username || '',
      totalMessages: account.totalMessages || 0,
      unreadMessages: account.unreadMessages || 0,
      oldestUnreadMessage: account.oldestUnreadMessage || null,
      lastUpdated: account.lastUpdated ? account.lastUpdated.toISOString() : new Date().toISOString()
    }))

    return NextResponse.json(formattedAccounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    // Ha adatbázis hiba van, üres tömböt küldünk vissza 200-as státusszal
    // hogy a frontend ne dobjon hibát
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Ellenőrizzük a kötelező mezőket
    if (!body.platform || !body.username) {
      return NextResponse.json(
        { error: 'A platform és felhasználónév megadása kötelező' },
        { status: 400 }
      )
    }

    const account = await prisma.account.create({
      data: {
        platform: body.platform,
        username: body.username,
        totalMessages: body.totalMessages || 0,
        unreadMessages: body.unreadMessages || 0,
        oldestUnreadMessage: body.oldestUnreadMessage || new Date().toISOString(),
        lastUpdated: new Date()
      }
    })
    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Nem sikerült létrehozni a fiókot' },
      { status: 500 }
    )
  }
} 