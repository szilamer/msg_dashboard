const express = require('express');
const router = express.Router();
const messengerService = require('../services/messengerService');

// Új Messenger fiók létrehozása
router.post('/accounts', (req, res) => {
    try {
        const accountId = req.body.accountId || `messenger_${Date.now()}`;
        const account = messengerService.createAccount(accountId);
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

// Messenger fiók inicializálása
router.post('/accounts/:accountId/initialize', async (req, res) => {
    try {
        const { accountId } = req.params;
        const account = messengerService.getAccount(accountId);
        
        if (!account) {
            return res.status(404).json({ error: 'Fiók nem található' });
        }

        const result = await account.initialize();
        res.json(result);
    } catch (error) {
        console.error('Hiba a Messenger fiók inicializálásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Beszélgetések lekérése
router.get('/accounts/:accountId/conversations', async (req, res) => {
    try {
        const { accountId } = req.params;
        const account = messengerService.getAccount(accountId);
        
        if (!account) {
            return res.status(404).json({ error: 'Fiók nem található' });
        }

        const conversations = await account.scrapeConversations();
        res.json({ conversations });
    } catch (error) {
        console.error('Hiba a beszélgetések lekérésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Messenger fiók bezárása
router.post('/accounts/:accountId/close', async (req, res) => {
    try {
        const { accountId } = req.params;
        const account = messengerService.getAccount(accountId);
        
        if (!account) {
            return res.status(404).json({ error: 'Fiók nem található' });
        }

        await account.close();
        res.json({ success: true });
    } catch (error) {
        console.error('Hiba a Messenger fiók bezárásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Messenger fiók törlése
router.delete('/accounts/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        await messengerService.removeAccount(accountId);
        res.json({ success: true });
    } catch (error) {
        console.error('Hiba a Messenger fiók törlésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Összes Messenger fiók lekérése
router.get('/accounts', (req, res) => {
    try {
        const accounts = messengerService.getAllAccounts();
        res.json({ accounts });
    } catch (error) {
        console.error('Hiba a Messenger fiókok lekérésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 