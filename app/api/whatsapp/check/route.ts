import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chrome from 'chrome-aws-lambda'

export const runtime = 'nodejs'

export async function GET() {
  let browser = null

  try {
    // Puppeteer indítása
    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
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

    // Adatok mentése az adatbázisba
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'whatsapp',
        username: 'user', // TODO: Felhasználónév kinyerése
        ...stats
      })
    })

    if (!response.ok) {
      throw new Error('Hiba az adatok mentése során')
    }

    return NextResponse.json({ isLoggedIn: true, stats })
  } catch (error) {
    console.error('WhatsApp ellenőrzési hiba:', error)
    return NextResponse.json({ isLoggedIn: false, error: error.message })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
} 