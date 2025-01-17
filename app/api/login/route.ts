import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import puppeteer from 'puppeteer-core'
import chrome from 'chrome-aws-lambda'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json()
    
    // Böngésző indítása
    const browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: false // Fejlesztés közben false, hogy lássuk mi történik
    })

    const page = await browser.newPage()
    
    // Platform-specifikus logika
    switch (platform) {
      case 'whatsapp':
        await handleWhatsApp(page)
        break
      case 'skype':
        await handleSkype(page)
        break
      case 'messenger':
        await handleMessenger(page)
        break
      default:
        throw new Error('Nem támogatott platform')
    }

    // Böngésző bezárása
    await browser.close()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error)
    return NextResponse.json(
      { error: 'Hiba történt a bejelentkezés során' },
      { status: 500 }
    )
  }
}

async function handleWhatsApp(page: puppeteer.Page) {
  await page.goto('https://web.whatsapp.com')
  
  // Várjuk meg a QR kód beolvasását
  await page.waitForSelector('._2QgSC', { timeout: 60000 }) // Chat lista konténer

  // Adatok kinyerése
  const data = await page.evaluate(() => {
    const unreadBadges = document.querySelectorAll('span[aria-label*="olvasatlan"]')
    const totalChats = document.querySelectorAll('._2QgSC div[role="row"]').length
    
    return {
      username: 'WhatsApp User', // Ez később személyre szabható
      totalMessages: totalChats,
      unreadMessages: unreadBadges.length,
      oldestUnreadMessage: new Date().toISOString() // Ez később pontosítható
    }
  })

  // Adatok mentése az adatbázisba
  await prisma.account.upsert({
    where: {
      platform_username: {
        platform: 'whatsapp',
        username: data.username
      }
    },
    update: {
      totalMessages: data.totalMessages,
      unreadMessages: data.unreadMessages,
      oldestUnreadMessage: data.oldestUnreadMessage,
      lastUpdated: new Date()
    },
    create: {
      platform: 'whatsapp',
      username: data.username,
      totalMessages: data.totalMessages,
      unreadMessages: data.unreadMessages,
      oldestUnreadMessage: data.oldestUnreadMessage
    }
  })
}

// Hasonló függvények a többi platformhoz
async function handleSkype(page: puppeteer.Page) {
  // TODO: Skype implementáció
}

async function handleMessenger(page: puppeteer.Page) {
  // TODO: Messenger implementáció
} 