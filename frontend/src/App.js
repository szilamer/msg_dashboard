import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Typography, Button, Box, Alert, CircularProgress } from '@mui/material';
import WhatsAppAccount from './components/WhatsAppAccount';
import SkypeAccount from './components/SkypeAccount';
import MessengerAccount from './components/MessengerAccount';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);
  const [skypeAccounts, setSkypeAccounts] = useState([]);
  const [messengerAccounts, setMessengerAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleError = useCallback((message, error) => {
    console.error('Hiba történt:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Ismeretlen hiba történt';
    setError(`${message}: ${errorMessage}`);
    setLoading(false);
  }, []);

  const fetchWhatsAppAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/accounts`);
      setWhatsappAccounts(response.data || []);
    } catch (error) {
      handleError('WhatsApp fiókok lekérése sikertelen', error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const fetchWhatsAppChats = useCallback(async (accountId) => {
    try {
      setError(null);
      const response = await axios.get(`${API_URL}/api/whatsapp/accounts/${accountId}/chats`);
      
      if (response.data.needsLogin) {
        setWhatsappAccounts(accounts => accounts.map(account => 
          account.accountId === accountId 
            ? { ...account, needsLogin: true, status: 'waiting_for_qr' }
            : account
        ));
        return;
      }

      setWhatsappAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { 
              ...account, 
              chats: response.data.chats,
              status: 'connected',
              needsLogin: false,
              error: null
            }
          : account
      ));
    } catch (error) {
      handleError('WhatsApp chatek lekérése sikertelen', error);
      setWhatsappAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, error: error.message }
          : account
      ));
    }
  }, [handleError]);

  const handleCreateWhatsAppAccount = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/whatsapp/accounts`);
      setWhatsappAccounts(accounts => [...accounts, { ...response.data, status: 'created' }]);
    } catch (error) {
      handleError('WhatsApp fiók létrehozása sikertelen', error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleWhatsAppInitialize = useCallback(async (accountId) => {
    try {
      setError(null);
      
      // Először beállítjuk az inicializálási állapotot
      setWhatsappAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'initializing', error: null }
          : account
      ));

      const response = await axios.post(`${API_URL}/api/whatsapp/accounts/${accountId}/initialize`);
      
      setWhatsappAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, ...response.data }
          : account
      ));

      // Ha sikeres az inicializálás és már csatlakozva van, lekérjük a chateket
      if (response.data.status === 'connected') {
        await fetchWhatsAppChats(accountId);
      }

    } catch (error) {
      handleError('WhatsApp inicializálás sikertelen', error);
      setWhatsappAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'error', error: error.message }
          : account
      ));
    }
  }, [fetchWhatsAppChats, handleError]);

  const handleWhatsAppRefresh = useCallback(async (accountId) => {
    try {
      setError(null);
      await fetchWhatsAppChats(accountId);
    } catch (error) {
      handleError('WhatsApp frissítés sikertelen', error);
    }
  }, [fetchWhatsAppChats, handleError]);

  const handleWhatsAppDelete = useCallback(async (accountId) => {
    try {
      setError(null);
      setLoading(true);
      await axios.delete(`${API_URL}/api/whatsapp/accounts/${accountId}`);
      await fetchWhatsAppAccounts();
      setLoading(false);
    } catch (error) {
      handleError('WhatsApp fiók törlése sikertelen', error);
    }
  }, [fetchWhatsAppAccounts, handleError]);

  // Skype functions
  const fetchSkypeAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/skype/accounts`);
      setSkypeAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      handleError('Skype fiókok lekérése sikertelen', error);
      setSkypeAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleCreateSkypeAccount = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/skype/accounts`);
      setSkypeAccounts(accounts => [...(Array.isArray(accounts) ? accounts : []), 
        { ...response.data, status: 'created' }
      ]);
    } catch (error) {
      handleError('Skype fiók létrehozása sikertelen', error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleSkypeInitialize = useCallback(async (accountId) => {
    try {
      setError(null);
      
      // Inicializálási állapot beállítása
      setSkypeAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'initializing', error: null }
          : account
      ));

      const response = await axios.post(`${API_URL}/api/skype/accounts/${accountId}/initialize`);
      
      setSkypeAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, ...response.data }
          : account
      ));

      // Ha sikeres az inicializálás, frissítjük a fiók adatait
      if (response.data.status === 'connected') {
        const chatsResponse = await axios.get(`${API_URL}/api/skype/accounts/${accountId}/chats`);
        setSkypeAccounts(accounts => accounts.map(account => 
          account.accountId === accountId 
            ? { 
                ...account, 
                chats: chatsResponse.data.chats,
                status: 'connected',
                needsLogin: false,
                error: null
              }
            : account
        ));
      }

    } catch (error) {
      handleError('Skype inicializálás sikertelen', error);
      setSkypeAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'error', error: error.message }
          : account
      ));
    }
  }, [handleError]);

  const handleSkypeRefresh = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/api/skype/accounts/${accountId}/refresh`);
      await fetchSkypeAccounts();
    } catch (error) {
      handleError('Skype frissítés sikertelen', error);
    }
  }, [fetchSkypeAccounts, handleError]);

  const handleSkypeClose = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/api/skype/accounts/${accountId}/close`);
      await fetchSkypeAccounts();
    } catch (error) {
      handleError('Skype fiók bezárása sikertelen', error);
    }
  }, [fetchSkypeAccounts, handleError]);

  const handleSkypeDelete = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.delete(`${API_URL}/api/skype/accounts/${accountId}`);
      await fetchSkypeAccounts();
    } catch (error) {
      handleError('Skype fiók törlése sikertelen', error);
    }
  }, [fetchSkypeAccounts, handleError]);

  // Messenger functions
  const fetchMessengerAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/messenger/accounts`);
      setMessengerAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      handleError('Messenger fiókok lekérése sikertelen', error);
      setMessengerAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleCreateMessengerAccount = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/messenger/accounts`);
      setMessengerAccounts(accounts => [...(Array.isArray(accounts) ? accounts : []), 
        { ...response.data, status: 'created' }
      ]);
    } catch (error) {
      handleError('Messenger fiók létrehozása sikertelen', error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleMessengerInitialize = useCallback(async (accountId) => {
    try {
      setError(null);
      
      // Inicializálási állapot beállítása
      setMessengerAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'initializing', error: null }
          : account
      ));

      const response = await axios.post(`${API_URL}/api/messenger/accounts/${accountId}/initialize`);
      
      setMessengerAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, ...response.data }
          : account
      ));

      // Ha sikeres az inicializálás, frissítjük a fiók adatait
      if (response.data.status === 'connected') {
        const conversationsResponse = await axios.get(`${API_URL}/api/messenger/accounts/${accountId}/conversations`);
        setMessengerAccounts(accounts => accounts.map(account => 
          account.accountId === accountId 
            ? { 
                ...account, 
                conversations: conversationsResponse.data.conversations,
                status: 'connected',
                needsLogin: false,
                error: null
              }
            : account
        ));
      }

    } catch (error) {
      handleError('Messenger inicializálás sikertelen', error);
      setMessengerAccounts(accounts => accounts.map(account => 
        account.accountId === accountId 
          ? { ...account, status: 'error', error: error.message }
          : account
      ));
    }
  }, [handleError]);

  const handleMessengerRefresh = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/api/messenger/accounts/${accountId}/refresh`);
      await fetchMessengerAccounts();
    } catch (error) {
      handleError('Messenger frissítés sikertelen', error);
    }
  }, [fetchMessengerAccounts, handleError]);

  const handleMessengerClose = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/api/messenger/accounts/${accountId}/close`);
      await fetchMessengerAccounts();
    } catch (error) {
      handleError('Messenger fiók bezárása sikertelen', error);
    }
  }, [fetchMessengerAccounts, handleError]);

  const handleMessengerDelete = useCallback(async (accountId) => {
    try {
      setError(null);
      await axios.delete(`${API_URL}/api/messenger/accounts/${accountId}`);
      await fetchMessengerAccounts();
    } catch (error) {
      handleError('Messenger fiók törlése sikertelen', error);
    }
  }, [fetchMessengerAccounts, handleError]);

  useEffect(() => {
    fetchWhatsAppAccounts();
    fetchSkypeAccounts();
    fetchMessengerAccounts();
  }, [fetchWhatsAppAccounts, fetchSkypeAccounts, fetchMessengerAccounts]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Üzenetküldő Dashboard
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* WhatsApp Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            WhatsApp Fiókok
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleCreateWhatsAppAccount}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Létrehozás...
                </>
              ) : (
                'Új WhatsApp Fiók'
              )}
            </Button>
          </Box>
          {whatsappAccounts.map(account => (
            <WhatsAppAccount
              key={account.accountId}
              account={account}
              onInitialize={handleWhatsAppInitialize}
              onRefresh={handleWhatsAppRefresh}
              onDelete={handleWhatsAppDelete}
            />
          ))}
          {!loading && whatsappAccounts.length === 0 && (
            <Typography variant="body1" color="text.secondary">
              Még nincs WhatsApp fiók hozzáadva. Kattints az "Új WhatsApp Fiók" gombra a kezdéshez.
            </Typography>
          )}
        </Box>

        {/* Skype Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Skype Fiókok
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleCreateSkypeAccount}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Létrehozás...
                </>
              ) : (
                'Új Skype Fiók'
              )}
            </Button>
          </Box>
          {skypeAccounts.map(account => (
            <SkypeAccount
              key={account.accountId}
              account={account}
              onInitialize={handleSkypeInitialize}
              onRefresh={handleSkypeRefresh}
              onClose={handleSkypeClose}
              onDelete={handleSkypeDelete}
            />
          ))}
          {!loading && skypeAccounts.length === 0 && (
            <Typography variant="body1" color="text.secondary">
              Még nincs Skype fiók hozzáadva. Kattints az "Új Skype Fiók" gombra a kezdéshez.
            </Typography>
          )}
        </Box>

        {/* Messenger Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Messenger Fiókok
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleCreateMessengerAccount}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Létrehozás...
                </>
              ) : (
                'Új Messenger Fiók'
              )}
            </Button>
          </Box>
          {messengerAccounts.map(account => (
            <MessengerAccount
              key={account.accountId}
              account={account}
              onInitialize={handleMessengerInitialize}
              onRefresh={handleMessengerRefresh}
              onClose={handleMessengerClose}
              onDelete={handleMessengerDelete}
            />
          ))}
          {!loading && messengerAccounts.length === 0 && (
            <Typography variant="body1" color="text.secondary">
              Még nincs Messenger fiók hozzáadva. Kattints az "Új Messenger Fiók" gombra a kezdéshez.
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default App;
