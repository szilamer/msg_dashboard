const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Chrome alapértelmezett telepítési útvonalai Windows-on
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH // Ha környezeti változóként van beállítva
].filter(Boolean);

const app = express();
app.use(cors());
app.use(express.json());

// Külön Map-ek minden platformhoz
const whatsappAccounts = new Map();
const skypeAccounts = new Map();
const messengerAccounts = new Map();
let browserInstances = new Map();

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Segédfüggvény a böngésző példány bezárásához
async function closeBrowser(accountId) {
  try {
    const browser = browserInstances.get(accountId);
    if (browser) {
      await browser.close();
      browserInstances.delete(accountId);
      console.log(`Böngésző bezárva: ${accountId}`);
    }
  } catch (error) {
    console.error(`Hiba a böngésző bezárásakor (${accountId}):`, error);
  }
}

// WhatsApp végpontok
app.get('/api/whatsapp/accounts', (req, res) => {
  const accountList = Array.from(whatsappAccounts.values());
  res.json(accountList);
});

app.post('/api/whatsapp/accounts', async (req, res) => {
  console.log('Új WhatsApp fiók létrehozása kezdődik...');
  try {
    const accountId = `whatsapp_${Date.now()}`;
    console.log(`Új fiók ID létrehozva: ${accountId}`);

    const account = {
      accountId: accountId,
      name: null,
      status: 'created',
      createdAt: new Date(),
      type: 'whatsapp',
      needsLogin: true,
      chats: [],
      error: null
    };
    
    whatsappAccounts.set(accountId, account);
    console.log('Fiók sikeresen létrehozva:', account);
    res.json(account);

  } catch (error) {
    console.error('Részletes hiba:', error);
    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók létrehozásakor: ' + error.message
    });
  }
});

// WhatsApp inicializálás végpont
app.post('/api/whatsapp/accounts/:accountId/initialize', async (req, res) => {
  const { accountId } = req.params;
  console.log(`WhatsApp fiók inicializálása: ${accountId}`);

  try {
    const account = whatsappAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    // Frissítjük az állapotot inicializálásra
    account.status = 'initializing';
    whatsappAccounts.set(accountId, account);

    // Bezárjuk a meglévő böngészőt, ha van
    await closeBrowser(accountId);

    console.log('Chrome indítása...');
    let executablePath = null;
    for (const path of CHROME_PATHS) {
      if (require('fs').existsSync(path)) {
        executablePath = path;
        console.log(`Chrome megtalálva: ${path}`);
        break;
      }
    }

    if (!executablePath) {
      throw new Error('Nem található telepített Chrome böngésző. Kérjük, telepítse a Google Chrome-ot.');
    }

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    browserInstances.set(accountId, browser);

    console.log('Új oldal megnyitása...');
    const page = await browser.newPage();
    
    // Timeout növelése
    await page.setDefaultNavigationTimeout(180000);
    await page.setDefaultTimeout(180000);
    
    console.log('WhatsApp Web betöltése...');
    await page.goto('https://web.whatsapp.com', {
      waitUntil: 'networkidle0',
      timeout: 180000
    });

    // Várunk vagy a QR kódra vagy a chat listára
    console.log('Várakozás a QR kódra vagy a chat listára...');
    try {
      const result = await Promise.race([
        waitForQRCode(page),
        waitForChatList(page)
      ]);

      if (result === 'qr') {
        console.log('QR kód megtalálva');
        account.status = 'waiting_for_qr';
        account.needsLogin = true;
        whatsappAccounts.set(accountId, account);
        return res.json({ 
          status: 'waiting_for_qr', 
          needsLogin: true 
        });
      } else if (result === 'chats') {
        console.log('Chat lista megtalálva');
        account.status = 'connected';
        account.needsLogin = false;
        
        // Azonnal lekérjük a chateket
        const chats = await fetchChats(page);
        account.chats = chats;
        whatsappAccounts.set(accountId, account);
        return res.json({ 
          status: 'connected', 
          needsLogin: false, 
          chats 
        });
      } else {
        throw new Error('Nem sikerült detektálni sem a QR kódot, sem a chat listát');
      }

    } catch (error) {
      console.error('Hiba a WhatsApp Web betöltésekor:', error);
      throw new Error('Nem sikerült betölteni a WhatsApp Web-et: ' + error.message);
    }

  } catch (error) {
    console.error('Részletes hiba:', error);
    await closeBrowser(accountId);
    
    if (whatsappAccounts.has(accountId)) {
      const account = whatsappAccounts.get(accountId);
      account.status = 'error';
      account.error = error.message;
      whatsappAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók inicializálásakor: ' + error.message
    });
  }
});

// Segédfüggvények a WhatsApp állapotok ellenőrzéséhez
async function waitForQRCode(page) {
  try {
    await Promise.race([
      page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 60000 }),
      page.waitForSelector('div[data-testid="qrcode"]', { timeout: 60000 })
    ]);
    return 'qr';
  } catch (error) {
    return null;
  }
}

async function waitForChatList(page) {
  try {
    await page.waitForSelector('#pane-side', { timeout: 60000 });
    return 'chats';
  } catch (error) {
    return null;
  }
}

async function fetchChats(page) {
  await page.waitForSelector('[aria-label="Csevegések listája"]', { timeout: 30000 });
  
  // Várunk egy kicsit, hogy betöltődjenek a chat-ek
  await page.waitForTimeout(5000);
  
  // Chat-ek kinyerése az új struktúrának megfelelően
  const chats = await page.evaluate(() => {
    const chatElements = document.querySelectorAll('div[role="listitem"]');
    console.log('Talált chat elemek száma:', chatElements.length);
    
    return Array.from(chatElements).map(chat => {
      try {
        // Név kiválasztása az új struktúrából
        const nameElement = chat.querySelector('div._ak72 span[dir="auto"]') || 
                          chat.querySelector('div._ak72 img[alt]');
        
        // Olvasatlan üzenetek az új struktúrából
        const unreadBadge = chat.querySelector('span[aria-label*="olvasatlan"]') ||
                          chat.querySelector('span._aumw');

        // Időbélyeg keresése a _ak8i osztályú div-ben
        const timestampDiv = chat.querySelector('div._ak8i');
        const lastMessageTimestamp = timestampDiv ? timestampDiv.textContent.trim() : '';

        // Üzenetek számolása
        const messageElements = chat.querySelectorAll('span[dir="auto"]');
        const messageCount = messageElements.length;

        const name = nameElement?.getAttribute('alt') || nameElement?.textContent || 'Ismeretlen';
        const unreadCount = unreadBadge ? parseInt(unreadBadge.textContent) || 0 : 0;

        // Ha van olvasatlan üzenet, az időbélyeg lesz a legrégebbi olvasatlan
        const oldestUnreadTimestamp = unreadCount > 0 ? lastMessageTimestamp : null;

        console.log('Talált chat elem:', { 
          name, 
          unreadCount, 
          messageCount,
          lastMessageTimestamp,
          oldestUnreadTimestamp 
        });
        
        return { 
          name, 
          unreadCount,
          messageCount,
          lastMessageTimestamp,
          lastUnreadTimestamp: oldestUnreadTimestamp
        };
      } catch (error) {
        console.error('Hiba a chat adat kinyerésekor:', error);
        return null;
      }
    }).filter(chat => chat !== null);
  });

  console.log('Összes talált chat:', chats.length);
  return chats;
}

// Chat lekérés végpont
app.get('/api/whatsapp/accounts/:accountId/chats', async (req, res) => {
  const { accountId } = req.params;
  console.log(`Chat-ek lekérése: ${accountId}`);

  try {
    const account = whatsappAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    const browser = browserInstances.get(accountId);
    if (!browser) {
      throw new Error('A böngésző nem található, kérjük inicializálja újra a fiókot');
    }

    const pages = await browser.pages();
    const page = pages[pages.length - 1];

    // Ellenőrizzük, hogy be vagyunk-e jelentkezve
    console.log('Bejelentkezési állapot ellenőrzése...');
    const isQRVisible = await page.$('div[data-testid="qrcode"]')
      .then(elem => !!elem)
      .catch(() => false);

    if (isQRVisible) {
      account.status = 'waiting_for_qr';
      account.needsLogin = true;
      whatsappAccounts.set(accountId, account);
      return res.json({
        success: false,
        error: 'QR kód beolvasása szükséges',
        needsLogin: true
      });
    }

    // Chat-ek lekérése
    console.log('Chat-ek lekérése...');
    const chats = await fetchChats(page);
    console.log('Lekért chat-ek:', chats);

    // Fiók frissítése a chat adatokkal
    account.chats = chats;
    account.status = 'connected';
    account.needsLogin = false;
    account.error = null;
    whatsappAccounts.set(accountId, account);

    res.json({
      success: true,
      chats: chats
    });

  } catch (error) {
    console.error('Részletes hiba:', error);
    
    if (whatsappAccounts.has(accountId)) {
      const account = whatsappAccounts.get(accountId);
      account.error = error.message;
      whatsappAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a chat-ek lekérésekor: ' + error.message
    });
  }
});

// Fiók törlése végpont
app.delete('/api/whatsapp/accounts/:accountId', async (req, res) => {
  const { accountId } = req.params;
  console.log(`WhatsApp fiók törlése: ${accountId}`);

  try {
    await closeBrowser(accountId);
    whatsappAccounts.delete(accountId);
    res.json({ success: true });
  } catch (error) {
    console.error('Részletes hiba:', error);
    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók törlésekor',
      details: error.message
    });
  }
});

// Skype végpontok
app.get('/api/skype/accounts', (req, res) => {
  const accountList = Array.from(skypeAccounts.values());
  res.json(accountList);
});

app.post('/api/skype/accounts', async (req, res) => {
  console.log('Új Skype fiók létrehozása kezdődik...');
  try {
    const accountId = `skype_${Date.now()}`;
    console.log(`Új fiók ID létrehozva: ${accountId}`);

    const account = {
      accountId: accountId,
      name: null,
      status: 'created',
      createdAt: new Date(),
      type: 'skype',
      needsLogin: false,
      chats: [],
      error: null
    };
    
    skypeAccounts.set(accountId, account);
    console.log('Fiók sikeresen létrehozva:', account);
    res.json(account);

  } catch (error) {
    console.error('Részletes hiba:', error);
    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók létrehozásakor: ' + error.message
    });
  }
});

// Segédfüggvények a Skype állapotok ellenőrzéséhez
async function waitForSkypeLogin(page) {
  const startTime = Date.now();
  const timeout = 120000; // 2 perc timeout

  while (Date.now() - startTime < timeout) {
    try {
      // Próbáljuk megtalálni a bejelentkezési felületet
      const loginElement = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const microsoftButton = document.querySelector('div[data-provider-id="microsoft"]');
        const loginForm = document.querySelector('div[data-theme-id="theme-selector"]');
        
        console.log('Bejelentkezési elemek keresése:', {
          emailInput: !!emailInput,
          microsoftButton: !!microsoftButton,
          loginForm: !!loginForm
        });
        
        return !!(emailInput || microsoftButton || loginForm);
      });

      if (loginElement) {
        console.log('Bejelentkezési felület megtalálva');
        return 'login';
      }

      // Várunk 2 másodpercet a következő próbálkozás előtt
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Várakozás a bejelentkezési felületre...');
      await page.waitForTimeout(2000);
    }
  }

  return null;
}

async function waitForSkypeChatList(page) {
  const startTime = Date.now();
  const timeout = 120000; // 2 perc timeout

  while (Date.now() - startTime < timeout) {
    try {
      // Próbáljuk megtalálni a chat listát
      const chatListElement = await page.evaluate(() => {
        const chatGrid = document.querySelector('div[role="grid"]');
        const chatList = document.querySelector('div[role="list"]');
        const chatNav = document.querySelector('div[data-text-as-pseudo-element="Csevegések"]');
        
        console.log('Chat lista elemek keresése:', {
          chatGrid: !!chatGrid,
          chatList: !!chatList,
          chatNav: !!chatNav
        });
        
        return !!(chatGrid || chatList || chatNav);
      });

      if (chatListElement) {
        console.log('Chat lista megtalálva');
        return 'chats';
      }

      // Várunk 2 másodpercet a következő próbálkozás előtt
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Várakozás a chat listára...');
      await page.waitForTimeout(2000);
    }
  }

  return null;
}

// Segédfüggvény a Skype chat-ek kinyeréséhez
async function fetchSkypeChats(page) {
  try {
    // Várunk a chat lista betöltésére
    await Promise.race([
      page.waitForSelector('div[role="grid"]', { timeout: 60000 }),
      page.waitForSelector('div[role="list"]', { timeout: 60000 }),
      page.waitForSelector('div[data-text-as-pseudo-element="Csevegések"]', { timeout: 60000 }),
      page.waitForSelector('div[aria-label="Beszélgetések listája"]', { timeout: 60000 })
    ]);
    
    // Várunk egy kicsit, hogy betöltődjenek a chat-ek
    await page.waitForTimeout(5000);

    // Chat-ek kinyerése az új struktúrának megfelelően
    const chats = await page.evaluate(() => {
      const chatElements = document.querySelectorAll('div[role="listitem"]');
      console.log('Talált chat elemek száma:', chatElements.length);
      
      return Array.from(chatElements).map(chat => {
        try {
          // Név kinyerése
          const nameElements = Array.from(chat.querySelectorAll('div[data-text-as-pseudo-element]'));
          const name = nameElements.length > 0 ? nameElements[0].getAttribute('data-text-as-pseudo-element') : 'Ismeretlen';

          // Olvasatlan üzenetek száma
          const unreadBadge = chat.querySelector('.css-901oao.r-jwli3a');
          const unreadCount = unreadBadge ? parseInt(unreadBadge.textContent) || 0 : 0;

          // Dátum kinyerése
          let lastUnreadTimestamp = '';
          if (unreadCount > 0) {
            // Keressük a dátumot tartalmazó div-et
            const dateElements = chat.querySelectorAll('div');
            for (const elem of dateElements) {
              const text = elem.textContent.trim();
              // Keressük a dátum formátumot (pl. "2024. 01. 18.")
              if (text.match(/^\d{4}\.\s*\d{2}\.\s*\d{2}\.$/)) {
                lastUnreadTimestamp = text;
                console.log('Talált dátum:', text);
                break;
              }
            }
          }

          return {
            name,
            unreadCount,
            lastUnreadTimestamp
          };
        } catch (error) {
          console.error('Hiba egy chat elem feldolgozásakor:', error);
          return null;
        }
      }).filter(chat => chat !== null);
    });

    return chats;
  } catch (error) {
    console.error('Hiba a chat-ek lekérésekor:', error);
    return [];
  }
}

// Skype refresh végpont
app.post('/api/skype/accounts/:accountId/refresh', async (req, res) => {
  const { accountId } = req.params;
  console.log(`Skype fiók frissítése: ${accountId}`);

  try {
    const account = skypeAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    const browser = browserInstances.get(accountId);
    if (!browser) {
      throw new Error('A böngésző nem található, kérjük inicializálja újra a fiókot');
    }

    const pages = await browser.pages();
    const page = pages[pages.length - 1];

    // Ellenőrizzük, hogy be vagyunk-e jelentkezve
    console.log('Bejelentkezési állapot ellenőrzése...');
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      account.status = 'waiting_for_login';
      account.needsLogin = true;
      skypeAccounts.set(accountId, account);
      return res.json({
        success: false,
        error: 'Bejelentkezés szükséges',
        needsLogin: true
      });
    }

    // Chat lista frissítése görgetéssel
    console.log('Chat lista frissítése...');
    await page.evaluate(() => {
      const chatList = document.querySelector('div[role="grid"]') || 
                      document.querySelector('div[role="list"]') ||
                      document.querySelector('div[data-text-as-pseudo-element="Csevegések"]');
      if (chatList) {
        // Görgetés fel-le a frissítéshez
        chatList.scrollTop = chatList.scrollHeight;
        setTimeout(() => {
          chatList.scrollTop = 0;
        }, 100);
      }
    });

    // Várunk egy kicsit a frissítés után
    await page.waitForTimeout(2000);

    // Chat-ek lekérése
    console.log('Chat-ek lekérése...');
    const chats = await fetchSkypeChats(page);
    console.log('Lekért chat-ek:', chats);

    // Fiók frissítése a chat adatokkal
    account.chats = chats;
    account.status = 'connected';
    account.needsLogin = false;
    account.error = null;
    skypeAccounts.set(accountId, account);

    res.json({
      success: true,
      chats: chats
    });

  } catch (error) {
    console.error('Részletes hiba:', error);
    
    if (skypeAccounts.has(accountId)) {
      const account = skypeAccounts.get(accountId);
      account.error = error.message;
      skypeAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók frissítésekor: ' + error.message
    });
  }
});

// Messenger végpontok
app.get('/api/messenger/accounts', (req, res) => {
  const accountList = Array.from(messengerAccounts.values());
  res.json(accountList);
});

app.post('/api/messenger/accounts', async (req, res) => {
  console.log('Új Messenger fiók létrehozása kezdődik...');
  try {
    const accountId = `messenger_${Date.now()}`;
    console.log(`Új fiók ID létrehozva: ${accountId}`);

    const account = {
      accountId: accountId,
      name: null,
      status: 'created',
      createdAt: new Date(),
      type: 'messenger',
      needsLogin: false,
      chats: [],
      error: null
    };
    
    messengerAccounts.set(accountId, account);
    console.log('Fiók sikeresen létrehozva:', account);
    res.json(account);

  } catch (error) {
    console.error('Részletes hiba:', error);
    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók létrehozásakor: ' + error.message
    });
  }
});

app.post('/api/messenger/accounts/:accountId/initialize', async (req, res) => {
  const { accountId } = req.params;
  console.log(`Messenger fiók inicializálása: ${accountId}`);

  try {
    const account = messengerAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    // Frissítjük az állapotot inicializálásra
    account.status = 'initializing';
    messengerAccounts.set(accountId, account);

    // Bezárjuk a meglévő böngészőt, ha van
    await closeBrowser(accountId);

    console.log('Chrome indítása...');
    let executablePath = null;
    for (const path of CHROME_PATHS) {
      if (require('fs').existsSync(path)) {
        executablePath = path;
        console.log(`Chrome megtalálva: ${path}`);
        break;
      }
    }

    if (!executablePath) {
      throw new Error('Nem található telepített Chrome böngésző. Kérjük, telepítse a Google Chrome-ot.');
    }

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    browserInstances.set(accountId, browser);

    console.log('Új oldal megnyitása...');
    const page = await browser.newPage();
    
    // Timeout növelése
    await page.setDefaultNavigationTimeout(180000);
    await page.setDefaultTimeout(180000);
    
    console.log('Messenger betöltése...');
    await page.goto('https://www.messenger.com', {
      waitUntil: 'networkidle0',
      timeout: 180000
    });

    // Várunk vagy a bejelentkezési űrlapra vagy a beszélgetéslistára
    console.log('Várakozás a bejelentkezési űrlapra vagy a beszélgetéslistára...');
    try {
      const loginForm = await page.$('input[name="email"]');
      const chatList = await page.$('div[role="navigation"]');

      if (loginForm) {
        console.log('Bejelentkezési űrlap megjelent');
        account.status = 'waiting_for_login';
        account.needsLogin = true;
        messengerAccounts.set(accountId, account);
        return res.json({ 
          status: 'waiting_for_login', 
          needsLogin: true 
        });
      } else if (chatList) {
        console.log('Beszélgetéslista megjelent');
        account.status = 'connected';
        account.needsLogin = false;
        messengerAccounts.set(accountId, account);
        return res.json({ 
          status: 'connected', 
          needsLogin: false
        });
      } else {
        throw new Error('Nem sikerült detektálni sem a bejelentkezési űrlapot, sem a beszélgetéslistát');
      }

    } catch (error) {
      console.error('Hiba a Messenger betöltésekor:', error);
      throw new Error('Nem sikerült betölteni a Messenger-t: ' + error.message);
    }

  } catch (error) {
    console.error('Részletes hiba:', error);
    await closeBrowser(accountId);
    
    if (messengerAccounts.has(accountId)) {
      const account = messengerAccounts.get(accountId);
      account.status = 'error';
      account.error = error.message;
      messengerAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók inicializálásakor: ' + error.message
    });
  }
});

// Skype chat lekérés végpont
app.get('/api/skype/accounts/:accountId/chats', async (req, res) => {
  const { accountId } = req.params;
  console.log(`Skype chat-ek lekérése: ${accountId}`);

  try {
    const account = skypeAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    const browser = browserInstances.get(accountId);
    if (!browser) {
      throw new Error('A böngésző nem található, kérjük inicializálja újra a fiókot');
    }

    const pages = await browser.pages();
    const page = pages[pages.length - 1];

    // Ellenőrizzük, hogy be vagyunk-e jelentkezve
    console.log('Bejelentkezési állapot ellenőrzése...');
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      account.status = 'waiting_for_login';
      account.needsLogin = true;
      skypeAccounts.set(accountId, account);
      return res.json({
        success: false,
        error: 'Bejelentkezés szükséges',
        needsLogin: true
      });
    }

    // Chat-ek lekérése
    console.log('Chat-ek lekérése...');
    const chats = await fetchSkypeChats(page);
    console.log('Lekért chat-ek:', chats);

    // Fiók frissítése a chat adatokkal
    account.chats = chats;
    account.status = 'connected';
    account.needsLogin = false;
    account.error = null;
    skypeAccounts.set(accountId, account);

    res.json({
      success: true,
      chats: chats
    });

  } catch (error) {
    console.error('Részletes hiba:', error);
    
    if (skypeAccounts.has(accountId)) {
      const account = skypeAccounts.get(accountId);
      account.error = error.message;
      skypeAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a chat-ek lekérésekor: ' + error.message
    });
  }
});

// Skype inicializálás végpont
app.post('/api/skype/accounts/:accountId/initialize', async (req, res) => {
  const { accountId } = req.params;
  console.log(`Skype fiók inicializálása: ${accountId}`);

  try {
    const account = skypeAccounts.get(accountId);
    if (!account) {
      throw new Error('A fiók nem található');
    }

    // Frissítjük az állapotot inicializálásra
    account.status = 'initializing';
    skypeAccounts.set(accountId, account);

    // Bezárjuk a meglévő böngészőt, ha van
    await closeBrowser(accountId);

    console.log('Chrome indítása...');
    let executablePath = null;
    for (const path of CHROME_PATHS) {
      if (require('fs').existsSync(path)) {
        executablePath = path;
        console.log(`Chrome megtalálva: ${path}`);
        break;
      }
    }

    if (!executablePath) {
      throw new Error('Nem található telepített Chrome böngésző. Kérjük, telepítse a Google Chrome-ot.');
    }

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: executablePath,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    browserInstances.set(accountId, browser);

    console.log('Új oldal megnyitása...');
    const page = await browser.newPage();
    
    // Timeout növelése
    await page.setDefaultNavigationTimeout(180000);
    await page.setDefaultTimeout(180000);
    
    console.log('Skype Web betöltése...');
    await page.goto('https://web.skype.com', {
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: 180000
    });

    // Várunk az oldal teljes betöltésére
    console.log('Várakozás az oldal teljes betöltésére...');
    await page.waitForTimeout(30000); // 30 másodperc várakozás

    // Várunk vagy a bejelentkezési felületre vagy a chat listára
    console.log('Várakozás a bejelentkezési felületre vagy a chat listára...');
    try {
      const result = await Promise.race([
        waitForSkypeLogin(page),
        waitForSkypeChatList(page)
      ]);

      if (result === 'login') {
        console.log('Bejelentkezési felület megjelent');
        account.status = 'waiting_for_login';
        account.needsLogin = true;
        skypeAccounts.set(accountId, account);
        return res.json({ 
          status: 'waiting_for_login', 
          needsLogin: true 
        });
      } else if (result === 'chats') {
        console.log('Chat lista megjelent');
        account.status = 'connected';
        account.needsLogin = false;
        
        // Azonnal lekérjük a chateket
        const chats = await fetchSkypeChats(page);
        account.chats = chats;
        skypeAccounts.set(accountId, account);
        
        return res.json({ 
          status: 'connected', 
          needsLogin: false,
          chats
        });
      } else {
        // Ha nem sikerült detektálni semmit, akkor is hagyjuk nyitva a böngészőt
        console.log('Nem sikerült detektálni sem a bejelentkezési felületet, sem a chat listát');
        account.status = 'waiting_for_login';
        account.needsLogin = true;
        skypeAccounts.set(accountId, account);
        return res.json({ 
          status: 'waiting_for_login', 
          needsLogin: true 
        });
      }

    } catch (error) {
      console.error('Hiba a Skype Web betöltésekor:', error);
      // Hiba esetén is hagyjuk nyitva a böngészőt
      account.status = 'waiting_for_login';
      account.needsLogin = true;
      skypeAccounts.set(accountId, account);
      return res.json({ 
        status: 'waiting_for_login', 
        needsLogin: true 
      });
    }

  } catch (error) {
    console.error('Részletes hiba:', error);
    // Csak akkor zárjuk be a böngészőt, ha kritikus hiba történt
    if (error.message.includes('Chrome') || error.message.includes('fiók nem található')) {
      await closeBrowser(accountId);
    }
    
    if (skypeAccounts.has(accountId)) {
      const account = skypeAccounts.get(accountId);
      account.status = 'error';
      account.error = error.message;
      skypeAccounts.set(accountId, account);
    }

    res.status(500).json({
      success: false,
      error: 'Hiba történt a fiók inicializálásakor: ' + error.message
    });
  }
});

// Általános végpontok
app.get('/api/accounts', (req, res) => {
  const allAccounts = [
    ...Array.from(whatsappAccounts.values()),
    ...Array.from(skypeAccounts.values()),
    ...Array.from(messengerAccounts.values())
  ];
  res.json(allAccounts);
});

// Kilépéskor takarítás
process.on('SIGINT', async () => {
  console.log('Szerver leállítása...');
  for (const browser of browserInstances.values()) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Hiba a böngésző bezárásakor:', error);
    }
  }
  process.exit();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Szerver fut a következő porton: ${PORT}`);
  console.log('Elérhető végpontok:');
  console.log('- GET /api/whatsapp/accounts');
  console.log('- POST /api/whatsapp/accounts');
  console.log('- GET /api/whatsapp/accounts/:accountId/chats');
  console.log('- POST /api/whatsapp/accounts/:accountId/initialize');
  console.log('- DELETE /api/whatsapp/accounts/:accountId');
  console.log('- GET /api/skype/accounts');
  console.log('- POST /api/skype/accounts');
  console.log('- GET /api/messenger/accounts');
  console.log('- POST /api/messenger/accounts');
  console.log('- GET /api/accounts');
}); 