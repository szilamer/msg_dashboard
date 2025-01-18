const express = require('express');
const router = express.Router();
const skypeManager = require('../services/skypeService');

// Összes fiók lekérése
router.get('/accounts', (req, res) => {
    try {
        const accounts = skypeManager.getAllAccounts();
        res.json(accounts);
    } catch (error) {
        console.error('Hiba a fiókok lekérésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Új fiók létrehozása
router.post('/accounts', (req, res) => {
    try {
        const accountId = req.body.accountId || `skype_${Date.now()}`;
        const account = skypeManager.createAccount(accountId);
        res.json({ 
            accountId: account.accountId,
            status: 'created',
            needsLogin: false
        });
    } catch (error) {
        console.error('Hiba a fiók létrehozásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fiók törlése
router.delete('/accounts/:accountId', async (req, res) => {
    try {
        await skypeManager.removeAccount(req.params.accountId);
        res.json({ message: 'Skype fiók törölve' });
    } catch (error) {
        console.error('Hiba a fiók törlésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Skype inicializálása egy fiókhoz
router.post('/accounts/:accountId/initialize', async (req, res) => {
    try {
        const account = skypeManager.getAccount(req.params.accountId);
        const result = await account.initialize();
        res.json({ 
            message: 'Skype szolgáltatás inicializálva',
            accountId: account.accountId,
            status: result.status,
            needsLogin: result.needsLogin
        });
    } catch (error) {
        console.error('Hiba a Skype inicializálásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat adatok lekérése egy fiókhoz
router.get('/accounts/:accountId/chats', async (req, res) => {
    try {
        const account = skypeManager.getAccount(req.params.accountId);
        const chats = await account.scrapeChats();
        
        res.json({
            accountId: account.accountId,
            status: 'connected',
            needsLogin: false,
            chats: chats
        });
    } catch (error) {
        console.error('Hiba a chatek lekérésekor:', error);
        if (error.message.includes('nincs inicializálva') || 
            error.message.includes('már nem elérhető')) {
            res.json({
                accountId: account.accountId,
                status: 'waiting_for_login',
                needsLogin: true,
                chats: []
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Skype bezárása egy fiókhoz
router.post('/accounts/:accountId/close', async (req, res) => {
    try {
        const account = skypeManager.getAccount(req.params.accountId);
        await account.close();
        res.json({ 
            message: 'Skype szolgáltatás leállítva',
            accountId: account.accountId
        });
    } catch (error) {
        console.error('Hiba a Skype bezárásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 