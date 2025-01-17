import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'

export async function GET() {
  let browser = null

  try {
    console.log('API: Puppeteer indítása...')
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
    console.log('API: Új oldal megnyitva')
    
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' })
    console.log('API: WhatsApp Web betöltve')

    try {
      await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 5000 })
      console.log('API: Chat lista megtalálva!')

      // Adatok kinyerése
      const stats = await page.evaluate(() => {
        const totalChats = document.querySelectorAll('div[data-testid="chat-list"] > div').length
        const unreadChats = document.querySelectorAll('div[data-testid="chat-list"] span[data-testid*="unread"]')
        const unreadCount = Array.from(unreadChats).reduce((sum, span) => {
          const count = parseInt(span.textContent || '0', 10)
          return sum + (isNaN(count) ? 1 : count)
        }, 0)

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

      console.log('API: Kinyert adatok:', stats)
      return NextResponse.json({ isLoggedIn: true, stats })
    } catch (error) {
      console.log('API: Chat lista nem található')
      return NextResponse.json({ isLoggedIn: false })
    }
  } catch (error) {
    console.error('API: Hiba:', error)
    return NextResponse.json({ 
      isLoggedIn: false, 
      error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' 
    })
  } finally {
    if (browser) {
      await browser.close()
      console.log('API: Browser bezárva')
    }
  }
} 