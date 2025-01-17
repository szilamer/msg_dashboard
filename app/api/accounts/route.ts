import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany()
    if (!accounts) return NextResponse.json([])
    
    // Explicit módon átalakítjuk az adatot, hogy biztosan tömb legyen
    const accountsArray = Array.isArray(accounts) ? accounts : [accounts]
    return NextResponse.json(accountsArray)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const account = await prisma.account.create({
      data: body
    })
    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
} 