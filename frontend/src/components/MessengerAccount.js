import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { Message, Refresh, Close, Delete } from '@mui/icons-material';

function MessengerAccount({ account, onInitialize, onRefresh, onClose, onDelete }) {
  // Számoljuk ki az olvasatlan üzenetek számát, ha vannak beszélgetések
  const unreadCount = React.useMemo(() => {
    if (!account?.conversations || !Array.isArray(account.conversations)) return 0;
    return account.conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  }, [account]);

  // Beszélgetések számának biztonságos kiszámítása
  const conversationCount = React.useMemo(() => {
    if (!account?.conversations || !Array.isArray(account.conversations)) return 0;
    return account.conversations.length;
  }, [account]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Messenger Account {account?.accountId && `(${account.accountId})`}
          </Typography>
          <Box>
            <Button
              startIcon={<Message />}
              variant="contained"
              color="primary"
              onClick={() => onInitialize(account?.accountId)}
              sx={{ mr: 1 }}
            >
              Initialize
            </Button>
            <Button
              startIcon={<Refresh />}
              variant="outlined"
              onClick={() => onRefresh(account?.accountId)}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              startIcon={<Close />}
              variant="outlined"
              color="warning"
              onClick={() => onClose(account?.accountId)}
              sx={{ mr: 1 }}
            >
              Close
            </Button>
            <Button
              startIcon={<Delete />}
              variant="outlined"
              color="error"
              onClick={() => onDelete(account?.accountId)}
            >
              Delete
            </Button>
          </Box>
        </Box>
        
        {account && (
          <Box>
            <Typography color="text.secondary" gutterBottom>
              Beszélgetések száma: {conversationCount}
            </Typography>
            <Typography color="text.secondary">
              Olvasatlan üzenetek: {unreadCount}
            </Typography>
            {account?.conversations?.some(conv => conv.unreadCount > 0) && (
              <Box sx={{ mt: 1 }}>
                <Typography color="warning.main">
                  Beszélgetés név: {
                    account.conversations.find(conv => conv.unreadCount > 0)?.name
                  }
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Utolsó üzenet: {
                    account.conversations.find(conv => conv.unreadCount > 0)?.lastMessageTimestamp
                  }
                </Typography>
                <Typography color="text.secondary" variant="caption" display="block">
                  Legrégebbi olvasatlan: {
                    account.conversations.find(conv => conv.unreadCount > 0)?.lastUnreadTimestamp
                  }
                </Typography>
              </Box>
            )}
            {account.error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {account.error}
              </Typography>
            )}
            {account.needsLogin && (
              <Typography color="info" sx={{ mt: 1 }}>
                Kérjük, jelentkezzen be a Facebook fiókjába!
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default MessengerAccount; 