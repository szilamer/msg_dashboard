import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export async function POST(request: Request) {
  let browser = null

  try {
    // Puppeteer indítása lokális Chrome-mal
    browser = await puppeteer.launch({
      headless: false, // Látható böngésző ablak
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows Chrome útvonal
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    })

    const page = await browser.newPage()
    
    // User Agent beállítása
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')
    
    await page.goto('https://web.whatsapp.com')

    // Várunk a chat lista megjelenésére
    await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 60000 }) // Hosszabb timeout

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

    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    console.error('Hiba történt:', error)
    return NextResponse.json({ error: 'Nem sikerült lekérni az adatokat', details: error.message })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
} 