import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'

export async function GET() {
  let browser = null

  try {
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
    await page.goto('https://web.whatsapp.com')

    // Várunk a chat lista megjelenésére
    await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 10000 })

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

    return NextResponse.json({ stats })
  } catch (error) {
    return NextResponse.json({ error: 'Nem sikerült lekérni az adatokat' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
} 