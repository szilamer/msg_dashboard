import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { Message, Refresh, Close, Delete } from '@mui/icons-material';

function SkypeAccount({ account, onInitialize, onRefresh, onClose, onDelete }) {
  // Számoljuk ki az olvasatlan üzenetek számát, ha vannak chatek
  const unreadCount = React.useMemo(() => {
    if (!account?.chats || !Array.isArray(account.chats)) return 0;
    return account.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  }, [account]);

  // Chatek számának biztonságos kiszámítása
  const chatCount = React.useMemo(() => {
    if (!account?.chats || !Array.isArray(account.chats)) return 0;
    return account.chats.length;
  }, [account]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Skype Account {account?.accountId && `(${account.accountId})`}
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
            <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Chatek száma: {account.chats.length}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Olvasatlan chatek: {account.chats.filter(chat => chat.unreadCount > 0).length}
              </Typography>
              {account.chats.find(chat => chat.unreadCount > 0) && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Utolsó olvasatlan chat: {account.chats.find(chat => chat.unreadCount > 0).name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Utolsó olvasatlan üzenet ideje: {account.chats.find(chat => chat.unreadCount > 0).lastUnreadTimestamp || account.chats.find(chat => chat.unreadCount > 0).timestamp}
                  </Typography>
                </>
              )}
            </Box>
            {account.error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {account.error}
              </Typography>
            )}
            {account.needsLogin && (
              <Typography color="info" sx={{ mt: 1 }}>
                Kérjük, jelentkezzen be a Skype fiókjába a megnyitott ablakban!
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default SkypeAccount; 