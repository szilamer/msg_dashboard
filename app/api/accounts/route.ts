import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: {
        lastUpdated: 'desc'
      }
    })
    
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    if (!body.platform || !body.username) {
      return NextResponse.json(
        { error: 'Platform and username are required' },
        { status: 400 }
      )
    }

    const data = {
      platform: body.platform,
      username: body.username,
      totalMessages: body.totalMessages ?? 0,
      unreadMessages: body.unreadMessages ?? 0,
      oldestUnreadMessage: body.oldestUnreadMessage ?? '',
      lastUpdated: new Date()
    }

    const account = await prisma.account.upsert({
      where: {
        platform_username: {
          platform: body.platform,
          username: body.username
        }
      },
      update: data,
      create: data
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 