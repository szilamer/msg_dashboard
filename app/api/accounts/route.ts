import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

interface Account {
  id: number
  platform: string
  username: string
  totalMessages: number
  unreadMessages: number
  oldestUnreadMessage: string
  lastUpdated: Date
}

// Singleton PrismaClient instance
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn']
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('GET /api/accounts - Kezdés')
    const accounts = await prisma.account.findMany({
      orderBy: {
        lastUpdated: 'desc'
      }
    })

    console.log(`GET /api/accounts - ${accounts.length} fiók található`)
    return NextResponse.json(accounts.map((account: Account) => ({
      ...account,
      id: account.id.toString()
    })))
  } catch (error) {
    console.error('GET /api/accounts - Hiba:', error)
    return NextResponse.json({ error: 'Adatbázis hiba történt' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/accounts - Kezdés')
    const body = await request.json()
    console.log('POST /api/accounts - Beérkezett adat:', body)
    
    // Validáljuk a kötelező mezőket
    if (!body.platform || !body.username) {
      console.error('POST /api/accounts - Hiányzó kötelező mezők')
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

    console.log('POST /api/accounts - Létező fiók:', existingAccount)

    let account: Account;
    try {
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
        console.log('POST /api/accounts - Fiók frissítve:', account)
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
        console.log('POST /api/accounts - Új fiók létrehozva:', account)
      }

      return NextResponse.json({
        success: true,
        data: {
          ...account,
          id: account.id.toString()
        }
      })
    } catch (dbError) {
      console.error('POST /api/accounts - Adatbázis művelet hiba:', dbError)
      return NextResponse.json(
        { error: 'Adatbázis művelet hiba történt' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/accounts - Általános hiba:', error)
    return NextResponse.json(
      { error: 'Szerver oldali hiba történt' },
      { status: 500 }
    )
  }
} 