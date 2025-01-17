import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'

export async function GET() {
  let browser = null

  try {
    console.log('Puppeteer indítása...')
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
    console.log('Új oldal megnyitva')
    
    // WhatsApp Web megnyitása
    console.log('WhatsApp Web betöltése...')
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' })
    console.log('WhatsApp Web betöltve')

    // Várunk a bejelentkezésre (QR kód szkennelése)
    console.log('Várakozás a chat lista megjelenésére...')
    try {
      await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 10000 }) // 10 másodperc
      console.log('Chat lista megtalálva!')

      // Extra várakozás, hogy biztosan betöltődjenek az adatok
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Extra várakozás után folytatás...')
    } catch (error) {
      console.log('Chat lista nem található, valószínűleg még nincs bejelentkezve')
      return NextResponse.json({ isLoggedIn: false })
    }

    // Adatok kinyerése
    console.log('Adatok kinyerése...')
    const stats = await page.evaluate(() => {
      // Összes chat megszámolása
      const totalChats = document.querySelectorAll('div[data-testid="chat-list"] > div').length
      console.log('Összes chat:', totalChats)

      // Olvasatlan üzenetek számolása
      const unreadChats = document.querySelectorAll('div[data-testid="chat-list"] span[data-testid*="unread"]')
      const unreadCount = Array.from(unreadChats).reduce((sum, span) => {
        const count = parseInt(span.textContent || '0', 10)
        return sum + (isNaN(count) ? 1 : count)
      }, 0)
      console.log('Olvasatlan üzenetek:', unreadCount)

      // Legrégebbi olvasatlan üzenet dátuma
      let oldestUnread = ''
      if (unreadChats.length > 0) {
        const firstUnreadChat = unreadChats[0].closest('div[data-testid="cell-frame-container"]')
        const timeElement = firstUnreadChat?.querySelector('span[data-testid*="last-msg-time"]')
        oldestUnread = timeElement?.textContent || ''
      }
      console.log('Legrégebbi olvasatlan:', oldestUnread)

      return {
        totalMessages: totalChats,
        unreadMessages: unreadCount,
        oldestUnreadMessage: oldestUnread
      }
    })

    console.log('Kinyert adatok:', stats)
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
      console.log('Browser bezárva')
    }
  }
} 