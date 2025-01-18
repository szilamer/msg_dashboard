import React, { useMemo } from 'react';
import { Box, Button, Card, CardContent, Typography, CircularProgress } from '@mui/material';

function WhatsAppAccount({ account, onInitialize, onRefresh, onDelete }) {
  const chatCount = useMemo(() => account?.chats?.length || 0, [account?.chats]);
  const unreadCount = useMemo(() => 
    account?.chats?.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0) || 0,
    [account?.chats]
  );

  const isInitializing = account?.status === 'initializing';
  const isWaitingForQR = account?.status === 'waiting_for_qr';
  const isConnected = account?.status === 'connected';
  const isCreated = account?.status === 'created';

  const getStatusText = () => {
    switch (account?.status) {
      case 'initializing': return 'Inicializálás...';
      case 'waiting_for_qr': return 'QR kód beolvasásra vár';
      case 'connected': return 'Csatlakozva';
      case 'created': return 'Létrehozva';
      case 'error': return 'Hiba történt';
      default: return 'Ismeretlen állapot';
    }
  };

  const getStatusColor = () => {
    switch (account?.status) {
      case 'connected': return 'success.main';
      case 'error': return 'error.main';
      case 'waiting_for_qr': return 'info.main';
      case 'initializing': return 'warning.main';
      case 'created': return 'text.secondary';
      default: return 'text.secondary';
    }
  };

  return (
    <Card sx={{ minWidth: 275, m: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          WhatsApp Fiók
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography color="text.secondary" gutterBottom>
            Azonosító: {account?.accountId}
          </Typography>
          <Typography color={getStatusColor()} gutterBottom>
            Státusz: {getStatusText()}
          </Typography>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            onClick={() => onInitialize(account.accountId)}
            disabled={isInitializing || isWaitingForQR}
            startIcon={isInitializing ? <CircularProgress size={20} /> : null}
          >
            {isInitializing ? 'Inicializálás...' : 'Initialize'}
          </Button>
          
          {isConnected && (
            <Button 
              variant="outlined" 
              onClick={() => onRefresh(account.accountId)}
              startIcon={account.isRefreshing ? <CircularProgress size={20} /> : null}
              disabled={account.isRefreshing}
            >
              {account.isRefreshing ? 'Frissítés...' : 'Frissítés'}
            </Button>
          )}
          
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => onDelete(account.accountId)}
            disabled={isInitializing}
          >
            Törlés
          </Button>
        </Box>
        
        {isConnected && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Statisztika
            </Typography>
            <Typography color="text.secondary">
              Chat-ek száma: {chatCount}
            </Typography>
            <Typography color="text.secondary">
              Olvasatlan üzenetek: {unreadCount}
            </Typography>
            {account?.chats?.some(chat => chat.unreadCount > 0) && (
              <Box sx={{ mt: 1 }}>
                <Typography color="warning.main">
                  Chat név: {
                    account.chats.find(chat => chat.unreadCount > 0)?.name
                  }
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Utolsó üzenet: {
                    account.chats.find(chat => chat.unreadCount > 0)?.lastMessageTimestamp
                  }
                </Typography>
                <Typography color="text.secondary" variant="caption" display="block">
                  Legrégebbi olvasatlan: {
                    account.chats.find(chat => chat.unreadCount > 0)?.lastUnreadTimestamp
                  }
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {account?.error && (
          <Typography color="error" sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            Hiba: {account.error}
          </Typography>
        )}
        
        {isWaitingForQR && (
          <Typography 
            color="info.main" 
            sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'info.light', 
              borderRadius: 1,
              fontWeight: 'medium'
            }}
          >
            Kérjük, olvassa be a QR kódot a WhatsApp alkalmazással!
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default WhatsAppAccount; 