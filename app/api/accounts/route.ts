import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: {
        lastUpdated: 'desc'
      }
    })
    
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Hiba a fiókok lekérése során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a fiókok lekérése során' },
      { status: 500 }
    )
  }
} 