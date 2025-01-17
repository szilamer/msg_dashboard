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
      orderBy: {
        lastUpdated: 'desc'
      }
    })

    return NextResponse.json(accounts.map(account => ({
      ...account,
      id: account.id.toString()
    })))
  } catch (error) {
    console.error('Hiba a fiókok lekérdezése során:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validáljuk a kötelező mezőket
    if (!body.platform || !body.username) {
      return NextResponse.json(
        { error: 'A platform és felhasználónév megadása kötelező' },
        { status: 400 }
      )
    }

    // Ellenőrizzük, hogy létezik-e már a fiók
    const existingAccount = await prisma.account.findFirst({
      where: {
        platform: body.platform,
        username: body.username
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
          totalMessages: body.totalMessages || 0,
          unreadMessages: body.unreadMessages || 0,
          oldestUnreadMessage: body.oldestUnreadMessage || new Date().toISOString(),
          lastUpdated: new Date()
        }
      })
    } else {
      // Ha nem létezik, létrehozzuk
      account = await prisma.account.create({
        data: {
          platform: body.platform,
          username: body.username,
          totalMessages: body.totalMessages || 0,
          unreadMessages: body.unreadMessages || 0,
          oldestUnreadMessage: body.oldestUnreadMessage || new Date().toISOString(),
          lastUpdated: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        id: account.id.toString()
      }
    })
  } catch (error) {
    console.error('Hiba a fiók mentése során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a fiók mentése során' },
      { status: 500 }
    )
  }
} 