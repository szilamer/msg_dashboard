import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma || new PrismaClient().$extends(withAccelerate())

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export async function GET() {
  try {
    const accounts = await prisma.account.findMany()
    if (!accounts) return NextResponse.json([])
    return NextResponse.json(accounts)
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