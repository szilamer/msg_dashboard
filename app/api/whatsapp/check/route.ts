import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'

export async function GET() {
  let browser = null

  try {
    // Puppeteer indítása
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      headless: true,
    })

    const page = await browser.newPage()
    
    // WhatsApp Web megnyitása
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' })

    // Várunk a bejelentkezésre (QR kód szkennelése)
    await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 1000 })

    // Adatok kinyerése
    const stats = await page.evaluate(() => {
      // Összes chat megszámolása
      const totalChats = document.querySelectorAll('div[data-testid="chat-list"] > div').length

      // Olvasatlan üzenetek számolása
      const unreadChats = document.querySelectorAll('div[data-testid="chat-list"] span[data-testid*="unread"]')
      const unreadCount = Array.from(unreadChats).reduce((sum, span) => {
        const count = parseInt(span.textContent || '0', 10)
        return sum + (isNaN(count) ? 1 : count)
      }, 0)

      // Legrégebbi olvasatlan üzenet dátuma
      let oldestUnread = ''
      if (unreadChats.length > 0) {
        const firstUnreadChat = unreadChats[0].closest('div[data-testid="cell-frame-container"]')
        const timeElement = firstUnreadChat?.querySelector('span[data-testid*="last-msg-time"]')
        oldestUnread = timeElement?.textContent || ''
      }

      return {
        totalMessages: totalChats,
        unreadMessages: unreadCount,
        oldestUnreadMessage: oldestUnread
      }
    })

    return NextResponse.json({ isLoggedIn: true, stats })
  } catch (error) {
    console.error('WhatsApp ellenőrzési hiba:', error)
    return NextResponse.json({ 
      isLoggedIn: false, 
      error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' 
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
} 