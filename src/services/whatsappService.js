const puppeteer = require('puppeteer');

class WhatsAppService {
    constructor(accountId) {
        this.accountId = accountId;
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        console.log(`WhatsAppService létrehozva (Fiók ID: ${accountId})`);
    }

    async initialize() {
        try {
            console.log('WhatsApp inicializálás kezdődik...');
            
            if (this.browser) {
                console.log('Már van futó böngésző példány, bezárás...');
                await this.close();
            }

            // Puppeteer beállítások módosítása
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                defaultViewport: {
                    width: 1280,
                    height: 900
                },
                args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
            });

            console.log('Böngésző elindítva');
            this.page = await this.browser.newPage();
            console.log('Új oldal létrehozva');

            // Timeout növelése
            await this.page.setDefaultNavigationTimeout(180000);
            await this.page.setDefaultTimeout(180000);

            console.log('WhatsApp Web oldal betöltése kezdődik...');
            await this.page.goto('https://web.whatsapp.com', {
                waitUntil: 'networkidle0',
                timeout: 180000
            });

            // Várakozás vagy a QR kódra vagy a chat lista megjelenésére
            try {
                console.log('Várakozás a QR kódra vagy a chat listára...');
                const result = await Promise.race([
                    this.waitForQRCode(),
                    this.waitForChatList()
                ]);

                if (result === 'qr') {
                    console.log('QR kód megjelent, kérjük olvassa be a telefonjával');
                    // QR kód méretének módosítása
                    await this.page.evaluate(() => {
                        const qrCanvas = document.querySelector('canvas[aria-label="Scan me!"]') || 
                                       document.querySelector('div[data-testid="qrcode"] canvas');
                        if (qrCanvas) {
                            qrCanvas.style.width = '300px';
                            qrCanvas.style.height = '300px';
                        }
                    });
                } else {
                    console.log('Chat lista megjelent, sikeres bejelentkezés');
                    this.isLoggedIn = true;
                }

                return { 
                    success: true,
                    status: result === 'qr' ? 'waiting_for_qr' : 'connected',
                    needsLogin: result === 'qr'
                };
            } catch (error) {
                console.log('Nem található sem QR kód, sem chat lista');
                throw new Error('Nem sikerült betölteni a WhatsApp Web oldalt');
            }
        } catch (error) {
            console.error('Részletes hiba a WhatsApp inicializálásakor:', error);
            if (this.browser) {
                await this.close();
            }
            throw error;
        }
    }

    async waitForQRCode() {
        try {
            await Promise.race([
                this.page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 60000 }),
                this.page.waitForSelector('div[data-testid="qrcode"]', { timeout: 60000 })
            ]);
            return 'qr';
        } catch (error) {
            return null;
        }
    }

    async waitForChatList() {
        try {
            await this.page.waitForSelector('#pane-side', { timeout: 60000 });
            return 'chats';
        } catch (error) {
            return null;
        }
    }

    async scrapeChats() {
        try {
            console.log('Chat-ek beolvasásának kezdete...');
            
            // Ellenőrizzük, hogy be vagyunk-e jelentkezve és várunk a chat lista betöltésére
            console.log('Várakozás a chat lista betöltésére...');
            await this.page.waitForSelector('#pane-side', { 
                timeout: 30000,
                visible: true 
            });

            // Várunk, hogy a chat lista teljesen betöltődjön
            console.log('Várakozás a chat lista teljes betöltésére...');
            await this.page.waitForTimeout(5000);

            // Debug: Oldal címének és URL-jének kiírása
            const title = await this.page.title();
            const url = await this.page.url();
            console.log('Oldal címe:', title);
            console.log('Oldal URL:', url);

            // Debug: HTML struktúra kiírása
            const html = await this.page.evaluate(() => {
                const paneElement = document.querySelector('#pane-side');
                if (!paneElement) {
                    console.log('#pane-side elem nem található');
                    return null;
                }
                console.log('#pane-side elem méretei:', {
                    scrollHeight: paneElement.scrollHeight,
                    clientHeight: paneElement.clientHeight,
                    offsetHeight: paneElement.offsetHeight
                });
                return paneElement.innerHTML;
            });

            if (!html) {
                throw new Error('Chat lista konténer nem található');
            }

            console.log('Chat lista HTML struktúra első 500 karaktere:', html.substring(0, 500));

            // Görgetés a chat listában a tartalom betöltéséhez
            console.log('Chat lista görgetése a tartalom betöltéséhez...');
            await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    const chatList = document.querySelector('#pane-side');
                    if (!chatList) {
                        console.log('Chat lista elem nem található görgetéshez');
                        resolve();
                        return;
                    }

                    console.log('Görgetés kezdete, kezdeti magasság:', chatList.scrollHeight);
                    let lastHeight = chatList.scrollHeight;
                    let attempts = 0;
                    const maxAttempts = 5;

                    const scrollInterval = setInterval(() => {
                        chatList.scrollTop = chatList.scrollHeight;
                        console.log('Görgetés... Új magasság:', chatList.scrollHeight);
                        
                        if (chatList.scrollHeight > lastHeight) {
                            lastHeight = chatList.scrollHeight;
                        } else {
                            attempts++;
                        }

                        if (attempts >= maxAttempts) {
                            clearInterval(scrollInterval);
                            chatList.scrollTop = 0;
                            console.log('Görgetés befejezve, végső magasság:', chatList.scrollHeight);
                            resolve();
                        }
                    }, 1000);
                });
            });

            // Várunk még egy kicsit a görgetés után
            console.log('Várakozás a görgetés utáni betöltésre...');
            await this.page.waitForTimeout(2000);
            
            // Chat-ek beolvasása
            console.log('Chat-ek beolvasásának megkezdése...');
            const chats = await this.page.evaluate(() => {
                // Próbáljuk különböző szelektorokkal
                const selectors = [
                    'div[role="row"]',
                    'div[role="listitem"]',
                    'div[data-testid="cell-frame-container"]',
                    'div[data-id]',
                    '#pane-side > div > div > div > div'
                ];

                let chatElements = null;
                let usedSelector = '';

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    console.log(`Selektor "${selector}" találatok száma:`, elements.length);
                    
                    if (elements.length > 0) {
                        chatElements = elements;
                        usedSelector = selector;
                        break;
                    }
                }

                if (!chatElements) {
                    console.log('Nem találtam chat elemeket egyik szelectorral sem');
                    return [];
                }

                console.log(`Talált chat elemek száma (${usedSelector}):`, chatElements.length);
                
                return Array.from(chatElements).map(chat => {
                    try {
                        // Név keresése
                        const nameElement = chat.querySelector('span[dir="auto"]');
                        
                        // Olvasatlan üzenetek számának keresése
                        const unreadBadge = chat.querySelector('span[aria-label*="olvasatlan"]') || 
                                          chat.querySelector('span[aria-label*="unread"]');
                        
                        // Utolsó üzenet keresése
                        const messageElement = chat.querySelector('[data-testid="conversation-info-header-chat-content"]') || 
                                            chat.querySelector('[data-testid="last-message"]') ||
                                            chat.querySelector('[data-testid="cell-frame-secondary"]') ||
                                            chat.querySelector('span[dir="ltr"]');
                        
                        // Időbélyeg keresése
                        const timestampElement = chat.querySelector('span[aria-label*=":"]') ||
                                               chat.querySelector('span[data-testid*="msg-time"]');
                        
                        const unreadCount = unreadBadge ? parseInt(unreadBadge.textContent) || 1 : 0;
                        const lastMessage = messageElement ? messageElement.textContent.trim() : '';
                        const timestamp = timestampElement ? 
                            timestampElement.getAttribute('aria-label') || timestampElement.textContent : 
                            new Date().toISOString();
                        
                        return {
                            name: nameElement ? nameElement.textContent.trim() : 'Ismeretlen',
                            lastMessage,
                            unreadCount,
                            timestamp,
                            oldestUnreadMessage: unreadCount > 0 ? lastMessage : null,
                            oldestUnreadTimestamp: unreadCount > 0 ? timestamp : null
                        };
                    } catch (error) {
                        console.error('Hiba egy chat feldolgozása során:', error);
                        return null;
                    }
                }).filter(chat => chat !== null);
            });

            console.log(`${chats.length} chat találva`);
            console.log('Talált chatek:', chats);
            return chats;
        } catch (error) {
            console.error('Részletes hiba a WhatsApp chatek beolvasásakor:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('WhatsApp böngésző bezárva');
                this.browser = null;
                this.page = null;
                this.isLoggedIn = false;
            }
        } catch (error) {
            console.error('Hiba a böngésző bezárásakor:', error);
            throw error;
        }
    }
}

// Fiók menedzser osztály létrehozása
class WhatsAppAccountManager {
    constructor() {
        this.accounts = new Map();
    }

    createAccount(accountId) {
        if (this.accounts.has(accountId)) {
            throw new Error(`A fiók már létezik: ${accountId}`);
        }
        const account = new WhatsAppService(accountId);
        this.accounts.set(accountId, account);
        return account;
    }

    getAccount(accountId) {
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error(`A fiók nem található: ${accountId}`);
        }
        return account;
    }

    async removeAccount(accountId) {
        const account = this.accounts.get(accountId);
        if (account) {
            await account.close();
            this.accounts.delete(accountId);
        }
    }

    getAllAccounts() {
        return Array.from(this.accounts.entries()).map(([id, account]) => ({
            accountId: id,
            isLoggedIn: account.isLoggedIn
        }));
    }
}

module.exports = new WhatsAppAccountManager(); 