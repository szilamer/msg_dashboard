const puppeteer = require('puppeteer');

class SkypeService {
    constructor(accountId) {
        this.accountId = accountId;
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.status = 'created';
        this.needsLogin = false;
        console.log(`SkypeService létrehozva (Fiók ID: ${accountId})`);
    }

    async initialize() {
        try {
            console.log('Skype inicializálás kezdődik...');
            
            // Státusz frissítése inicializálásra
            this.status = 'initializing';
            
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

            console.log('Skype Web oldal betöltése kezdődik...');
            await this.page.goto('https://web.skype.com', {
                waitUntil: 'networkidle0',
                timeout: 180000
            });

            try {
                console.log('Várakozás a bejelentkezési felületre vagy a chat listára...');
                const result = await Promise.race([
                    this.waitForLoginForm(),
                    this.waitForChatList()
                ]);

                if (result === 'login') {
                    console.log('Bejelentkezési felület megjelent');
                    this.status = 'waiting_for_login';
                    this.needsLogin = true;
                    this.isLoggedIn = false;
                    return { 
                        success: true,
                        status: this.status,
                        needsLogin: this.needsLogin
                    };
                } else {
                    console.log('Chat lista megjelent, sikeres bejelentkezés');
                    this.status = 'connected';
                    this.needsLogin = false;
                    this.isLoggedIn = true;
                    return { 
                        success: true,
                        status: this.status,
                        needsLogin: this.needsLogin
                    };
                }
            } catch (error) {
                console.log('Nem található sem bejelentkezési felület, sem chat lista');
                this.status = 'error';
                throw new Error('Nem sikerült betölteni a Skype Web oldalt');
            }
        } catch (error) {
            console.error('Részletes hiba a Skype inicializálásakor:', error);
            this.status = 'error';
            if (this.browser) {
                await this.close();
            }
            throw error;
        }
    }

    async waitForLoginForm() {
        try {
            await this.page.waitForSelector('div[data-text-as-pseudo-element="Sign in"], button[data-tid="joinSkype"]', {
                timeout: 60000,
                visible: true
            });
            return 'login';
        } catch (error) {
            return null;
        }
    }

    async waitForChatList() {
        try {
            await this.page.waitForSelector('div[role="grid"], div[role="list"]', {
                timeout: 60000,
                visible: true
            });
            return 'chats';
        } catch (error) {
            return null;
        }
    }

    async scrapeChats() {
        try {
            console.log('Chat-ek beolvasásának kezdete...');
            
            if (!this.page || !this.browser) {
                throw new Error('A böngésző nincs inicializálva. Kérjük, inicializálja újra a fiókot.');
            }

            if (this.initializationInProgress) {
                throw new Error('A fiók inicializálása még folyamatban van. Kérjük, várjon.');
            }

            // Ellenőrizzük, hogy az oldal még mindig nyitva van-e
            const pages = await this.browser.pages();
            if (!pages.includes(this.page)) {
                throw new Error('A böngésző oldal már nem elérhető. Kérjük, inicializálja újra a fiókot.');
            }

            // Várunk a chat lista betöltésére
            const chatListSelector = 'div[role="grid"], div[role="list"]';
            await this.page.waitForSelector(chatListSelector, { 
                timeout: 30000,
                visible: true 
            });

            console.log('Várakozás a chat lista teljes betöltésére...');
            await this.page.waitForTimeout(5000);

            // Chat-ek beolvasása
            const chats = await this.page.evaluate(() => {
                // Debug: Írjuk ki a teljes chat lista HTML-t
                const chatList = document.querySelector('div[role="grid"], div[role="list"]');
                console.log('Chat lista HTML:', chatList?.outerHTML);

                const chatElements = document.querySelectorAll('div[role="row"], div[role="listitem"]');
                console.log('Talált chat elemek száma:', chatElements.length);
                
                // Írjuk ki az első chat elem HTML-jét részletesen
                if (chatElements.length > 0) {
                    console.log('Első chat elem HTML:', chatElements[0].outerHTML);
                }
                
                return Array.from(chatElements).map(chat => {
                    try {
                        // Debug: Írjuk ki a chat elem összes gyermekét
                        console.log('Chat elem gyermekei:', Array.from(chat.children).map(child => ({
                            tag: child.tagName,
                            role: child.getAttribute('role'),
                            class: child.className,
                            text: child.textContent.trim()
                        })));

                        // Név keresése különböző szelektorokkal
                        const nameSelectors = [
                            'div[role="gridcell"] span[dir="auto"]',
                            'span[class*="title"]',
                            'div[class*="title"]'
                        ];
                        let nameElement = null;
                        for (const selector of nameSelectors) {
                            nameElement = chat.querySelector(selector);
                            if (nameElement) break;
                        }

                        // Olvasatlan üzenetek keresése
                        const unreadSelectors = [
                            'div[role="gridcell"] div[class*="unread"]',
                            'div[class*="unread"]',
                            'span[class*="unread"]'
                        ];
                        let unreadElement = null;
                        for (const selector of unreadSelectors) {
                            unreadElement = chat.querySelector(selector);
                            if (unreadElement) break;
                        }

                        // Dátum keresése - most minden szöveget kiírunk debug céllal
                        let timestamp = '';
                        const allTextElements = chat.querySelectorAll('*');
                        console.log('Minden szöveges elem:', Array.from(allTextElements)
                            .filter(el => el.textContent.trim())
                            .map(el => ({
                                text: el.textContent.trim(),
                                tag: el.tagName,
                                class: el.className
                            }))
                        );

                        // Keressük a dátumot minden szöveges elemben
                        for (const el of allTextElements) {
                            const text = el.textContent.trim();
                            if (text.match(/\d{1,2}:\d{2}/) || // óra:perc
                                text.match(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/) || // év.hónap.nap
                                text.match(/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/) || // nap.hónap.év
                                text.match(/tegnap/i) || // tegnap
                                text.match(/\d{1,2}\.\s*\d{1,2}\./) || // hónap.nap.
                                text.match(/jan|feb|már|ápr|máj|jún|júl|aug|szep|okt|nov|dec/i) || // hónapok
                                text.match(/yesterday|today|tomorrow/i)) { // angol időkifejezések
                                timestamp = text;
                                console.log('Talált időbélyeg:', {
                                    text,
                                    tag: el.tagName,
                                    class: el.className
                                });
                                        break;
                                    }
                                }

                        return {
                            name: nameElement ? nameElement.textContent.trim() : 'Ismeretlen',
                            unreadCount: unreadElement ? 1 : 0,
                            lastUnreadTimestamp: unreadElement ? timestamp : '',
                            timestamp: timestamp
                        };
                    } catch (error) {
                        console.error('Hiba egy chat elem feldolgozásakor:', error);
                        return null;
                    }
                }).filter(chat => chat !== null);
            });

            return chats;
        } catch (error) {
            console.error('Részletes hiba a Skype chatek beolvasásakor:', error);
            if (error.message.includes('Session closed') || error.message.includes('Target closed')) {
                this.isLoggedIn = false;
                this.page = null;
                this.initializationInProgress = false;
            }
            throw error;
        }
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('Skype böngésző bezárva');
            }
        } catch (error) {
            console.error('Hiba a böngésző bezárásakor:', error);
        } finally {
            this.browser = null;
            this.page = null;
            this.isLoggedIn = false;
            this.status = 'created';
            this.needsLogin = false;
        }
    }
}

class SkypeAccountManager {
    constructor() {
        this.accounts = new Map();
    }

    createAccount(accountId) {
        if (this.accounts.has(accountId)) {
            throw new Error(`A fiók már létezik: ${accountId}`);
        }
        const account = new SkypeService(accountId);
        this.accounts.set(accountId, account);
        return {
            accountId: account.accountId,
            status: 'created',
            needsLogin: false
        };
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
            status: account.status || 'created',
            needsLogin: account.needsLogin || false,
            isLoggedIn: account.isLoggedIn
        }));
    }
}

module.exports = new SkypeAccountManager(); 