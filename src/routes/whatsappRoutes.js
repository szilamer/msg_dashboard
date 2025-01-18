const express = require('express');
const router = express.Router();
const whatsappManager = require('../services/whatsappService');

// Összes fiók lekérése
router.get('/accounts', (req, res) => {
    try {
        const accounts = whatsappManager.getAllAccounts();
        res.json(accounts);
    } catch (error) {
        console.error('Hiba a fiókok lekérésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Új fiók létrehozása
router.post('/accounts', (req, res) => {
    try {
        const accountId = req.body.accountId || `whatsapp_${Date.now()}`;
        const account = whatsappManager.createAccount(accountId);
        res.json({ 
            message: 'WhatsApp fiók létrehozva',
            accountId: account.accountId
        });
    } catch (error) {
        console.error('Hiba a fiók létrehozásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fiók törlése
router.delete('/accounts/:accountId', async (req, res) => {
    try {
        await whatsappManager.removeAccount(req.params.accountId);
        res.json({ message: 'WhatsApp fiók törölve' });
    } catch (error) {
        console.error('Hiba a fiók törlésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// WhatsApp inicializálása egy fiókhoz
router.post('/accounts/:accountId/initialize', async (req, res) => {
    try {
        const account = whatsappManager.getAccount(req.params.accountId);
        const result = await account.initialize();
        res.json({ 
            accountId: account.accountId,
            status: result.status,
            needsLogin: result.needsLogin,
            success: result.success
        });
    } catch (error) {
        console.error('Hiba a WhatsApp inicializálásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat adatok lekérése egy fiókhoz
router.get('/accounts/:accountId/chats', async (req, res) => {
    try {
        const account = whatsappManager.getAccount(req.params.accountId);
        const result = await account.scrapeChats();
        
        if (result.error) {
            return res.json({
                accountId: account.accountId,
                error: result.error,
                needsLogin: result.needsLogin
            });
        }

        res.json({
            accountId: account.accountId,
            chats: result
        });
    } catch (error) {
        console.error('Hiba a chatek lekérésekor:', error);
        res.status(500).json({ error: error.message });
    }
});

// WhatsApp bezárása egy fiókhoz
router.post('/accounts/:accountId/close', async (req, res) => {
    try {
        const account = whatsappManager.getAccount(req.params.accountId);
        await account.close();
        res.json({ 
            message: 'WhatsApp szolgáltatás leállítva',
            accountId: account.accountId
        });
    } catch (error) {
        console.error('Hiba a WhatsApp bezárásakor:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 