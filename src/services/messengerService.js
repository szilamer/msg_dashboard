const puppeteer = require('puppeteer');

class MessengerService {
    constructor(accountId) {
        this.accountId = accountId;
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.status = 'created';
        this.needsLogin = false;
        console.log(`MessengerService létrehozva (Fiók ID: ${accountId})`);
    }

    async initialize() {
        try {
            console.log('Messenger inicializálás kezdődik...');
            
            // Státusz frissítése inicializálásra
            this.status = 'initializing';
            
            if (this.browser) {
                console.log('Már van futó böngésző példány, bezárás...');
                await this.close();
            }

            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                defaultViewport: null,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--window-size=600,700',
                    '--window-position=50,10',
                    '--force-device-scale-factor=0.75'
                ]
            });

            console.log('Böngésző elindítva');
            this.page = await this.browser.newPage();
            
            // Viewport beállítása a megfelelő megjelenítéshez
            await this.page.setViewport({
                width: 600,
                height: 700,
                deviceScaleFactor: 0.75,
                isMobile: false
            });

            console.log('Új oldal létrehozva');

            await this.page.setDefaultNavigationTimeout(180000);
            await this.page.setDefaultTimeout(180000);

            console.log('Messenger oldal betöltése kezdődik...');
            await this.page.goto('https://www.messenger.com', {
                waitUntil: 'networkidle0',
                timeout: 180000
            });

            try {
                console.log('Várakozás a bejelentkezési űrlapra vagy a beszélgetéslistára...');
                const result = await Promise.race([
                    this.page.waitForSelector('input[name="email"]', { 
                        timeout: 60000,
                        visible: true 
                    }).then(() => 'login'),
                    this.page.waitForSelector('div[role="navigation"]', { 
                        timeout: 60000,
                        visible: true 
                    }).then(() => 'conversations')
                ]);

                if (result === 'login') {
                    console.log('Bejelentkezési űrlap megjelent, kérjük jelentkezzen be');
                    this.status = 'waiting_for_login';
                    this.needsLogin = true;
                    this.isLoggedIn = false;
                    return { 
                        success: true,
                        status: this.status,
                        needsLogin: this.needsLogin
                    };
                } else {
                    console.log('Beszélgetéslista megjelent, sikeres bejelentkezés');
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
                console.log('Nem található sem bejelentkezési űrlap, sem beszélgetéslista');
                this.status = 'error';
                throw new Error('Nem sikerült betölteni a Messenger oldalt');
            }
        } catch (error) {
            console.error('Részletes hiba a Messenger inicializálásakor:', error);
            this.status = 'error';
            if (this.browser) {
                await this.close();
            }
            throw error;
        }
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
                this.isLoggedIn = false;
                this.status = 'created';
                this.needsLogin = false;
                console.log('Messenger böngésző bezárva');
            }
        } catch (error) {
            console.error('Hiba a böngésző bezárásakor:', error);
            throw error;
        }
    }
}

class MessengerAccountManager {
    constructor() {
        this.accounts = new Map();
    }

    createAccount(accountId) {
        if (this.accounts.has(accountId)) {
            throw new Error(`A fiók már létezik: ${accountId}`);
        }
        const account = new MessengerService(accountId);
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

module.exports = new MessengerAccountManager(); 