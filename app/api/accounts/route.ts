import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json({ error: 'Platform paraméter kötelező' }, { status: 400 })
    }

    const account = await prisma.account.findFirst({
      where: {
        platform: platform
      }
    })

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('Hiba történt:', error)
    return NextResponse.json({ error: 'Nem sikerült lekérni az adatokat', details: error.message }, { status: 500 })
  }
} 