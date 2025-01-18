const express = require('express');
const cors = require('cors');
require('dotenv').config();

const whatsappRoutes = require('./routes/whatsappRoutes');
const skypeRoutes = require('./routes/skypeRoutes');
const messengerRoutes = require('./routes/messengerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS beállítások
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Kérések naplózása
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/skype', skypeRoutes);
app.use('/api/messenger', messengerRoutes);

app.get('/api/health', (req, res) => {
    console.log('Health check endpoint meghívva');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alapértelmezett útvonal
app.get('/', (req, res) => {
    console.log('Gyökér endpoint meghívva');
    res.json({
        message: 'Üdvözöljük a Többfiókos Kommunikációs Dashboard API-n!',
        endpoints: {
            health: 'GET /api/health',
            whatsapp: {
                accounts: 'GET /api/whatsapp/accounts',
                createAccount: 'POST /api/whatsapp/accounts',
                initialize: 'POST /api/whatsapp/accounts/:accountId/initialize',
                getChats: 'GET /api/whatsapp/accounts/:accountId/chats',
            },
            skype: {
                accounts: 'GET /api/skype/accounts',
                createAccount: 'POST /api/skype/accounts',
                initialize: 'POST /api/skype/accounts/:accountId/initialize',
                getChats: 'GET /api/skype/accounts/:accountId/chats',
            },
            messenger: {
                accounts: 'GET /api/messenger/accounts',
                createAccount: 'POST /api/messenger/accounts',
                initialize: 'POST /api/messenger/accounts/:accountId/initialize',
                getConversations: 'GET /api/messenger/accounts/:accountId/conversations',
            }
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Szerver hiba:`, {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body
    });
    res.status(500).json({ 
        error: 'Szerver hiba történt!',
        message: err.message,
        timestamp: timestamp
    });
});

// Handle 404
app.use((req, res) => {
    console.log(`404 - Nem található: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Az endpoint nem található',
        path: req.url,
        method: req.method
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Szerver fut a következő porton: ${PORT}`);
    console.log('Elérhető végpontok:');
    console.log('- GET /api/health');
    console.log('- POST /api/whatsapp/accounts');
    console.log('- GET /api/whatsapp/accounts');
    console.log('- POST /api/whatsapp/accounts/:accountId/initialize');
    console.log('- GET /api/whatsapp/accounts/:accountId/chats');
    console.log('- POST /api/whatsapp/accounts/:accountId/close');
    console.log('- DELETE /api/whatsapp/accounts/:accountId');
    console.log('- GET /api/skype/accounts');
    console.log('- POST /api/skype/accounts');
    console.log('- POST /api/skype/accounts/:accountId/initialize');
    console.log('- GET /api/skype/accounts/:accountId/chats');
    console.log('- POST /api/skype/accounts/:accountId/close');
    console.log('- DELETE /api/skype/accounts/:accountId');
    console.log('- GET /api/messenger/accounts');
    console.log('- POST /api/messenger/accounts');
    console.log('- POST /api/messenger/accounts/:accountId/initialize');
    console.log('- GET /api/messenger/accounts/:accountId/conversations');
}); 