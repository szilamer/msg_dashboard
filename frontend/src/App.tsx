import React, { useEffect, useState, useCallback } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import MessageIcon from '@mui/icons-material/Message';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import axios from 'axios';

interface AccountStats {
  account_id: number;
  account_name: string;
  account_type: string;
  total_messages: number;
  unread_messages: number;
  last_unread_date: string;
  last_updated: string;
}

interface AccountFormData {
  account_type: string;
  account_name: string;
  credentials: Record<string, string>;
}

const ACCOUNT_TYPES = {
  'WhatsApp': {
    name: 'WhatsApp',
    fields: ['api_key', 'waba_id', 'phone_number_id']
  },
  'Skype': {
    name: 'Skype',
    fields: ['username', 'password']
  },
  'Messenger': {
    name: 'Messenger',
    fields: ['access_token']
  },
  'HelpScout': {
    name: 'HelpScout',
    fields: ['api_key']
  }
};

const columns: GridColDef[] = [
  { field: 'account_name', headerName: 'Account Name', width: 150 },
  { field: 'account_type', headerName: 'Account Type', width: 130 },
  { field: 'total_messages', headerName: 'Total Messages', width: 130, type: 'number' },
  { field: 'unread_messages', headerName: 'Unread Messages', width: 160, type: 'number' },
  { 
    field: 'last_unread_date', 
    headerName: 'Oldest Unread Message', 
    width: 200,
    valueFormatter: (params) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleString('en-US');
    }
  },
  { 
    field: 'last_updated', 
    headerName: 'Last Updated', 
    width: 200,
    valueFormatter: (params) => {
      return new Date(params.value).toLocaleString('en-US');
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    renderCell: (params) => (
      <IconButton
        onClick={() => params.row.onDelete(params.row.account_id)}
        color="error"
      >
        <DeleteIcon />
      </IconButton>
    ),
  },
];

// Új komponens az összesítéshez
const StatsSummary = ({ stats }: { stats: AccountStats[] }) => {
  const totalMessages = stats.reduce((sum, stat) => sum + stat.total_messages, 0);
  const totalUnread = stats.reduce((sum, stat) => sum + stat.unread_messages, 0);
  const accountCount = stats.length;

  // Legrégebbi olvasatlan üzenet meghatározása
  const oldestUnreadDate = stats.reduce((oldest, stat) => {
    if (!stat.last_unread_date) return oldest;
    if (!oldest) return stat.last_unread_date;
    return new Date(stat.last_unread_date) < new Date(oldest) ? stat.last_unread_date : oldest;
  }, null as string | null);

  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={3}>
          <Box display="flex" alignItems="center">
            <MessageIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="body1">
              Total Messages: <strong>{totalMessages.toLocaleString('en-US')}</strong>
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box display="flex" alignItems="center">
            <MarkEmailUnreadIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="body1">
              Unread: <strong>{totalUnread.toLocaleString('en-US')}</strong>
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box display="flex" alignItems="center">
            <Typography variant="body1">
              Oldest Unread: <strong>
                {oldestUnreadDate ? new Date(oldestUnreadDate).toLocaleString('en-US') : '-'}
              </strong>
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1">
              Active Accounts:
            </Typography>
            {Object.entries(stats.reduce((acc, stat) => {
              acc[stat.account_type] = (acc[stat.account_type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)).map(([type, count]) => (
              <Chip 
                key={type}
                label={`${type}: ${count}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

function App() {
  const [stats, setStats] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    account_type: '',
    account_name: '',
    credentials: {}
  });
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get<AccountStats[]>('http://localhost:8000/stats');
      setStats(response.data.map(stat => ({
        ...stat,
        onDelete: (accountId: number) => handleDeleteAccount(accountId)
      })));
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(async (accountId: number) => {
    try {
      await axios.delete(`http://localhost:8000/accounts/${accountId}`);
      await fetchStats();
    } catch (error) {
      setError('Error deleting account');
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      console.log("Starting refresh...");
      const response = await axios.post('http://localhost:8000/stats/refresh');
      console.log("Refresh response:", response.data);
      await fetchStats();
      console.log("Stats fetched after refresh");
    } catch (error) {
      console.error("Error during refresh:", error);
      setError('Error during refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      // Ellenőrizzük, hogy minden kötelező credential ki van-e töltve
      const requiredFields = ACCOUNT_TYPES[formData.account_type as keyof typeof ACCOUNT_TYPES]?.fields || [];
      const missingFields = requiredFields.filter(field => !formData.credentials[field]);
      
      if (missingFields.length > 0) {
        setError(`Please fill in the following fields: ${missingFields.join(', ')}`);
        return;
      }

      console.log('Sending data:', formData);
      
      const response = await axios.post('http://localhost:8000/accounts', formData);
      console.log('Backend response:', response.data);
      
      setOpenDialog(false);
      setFormData({
        account_type: '',
        account_name: '',
        credentials: {}
      });
      await fetchStats();
    } catch (error: any) {
      console.error('Error details:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Error creating account');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Message Statistics
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            Add New Account
          </Button>
          <IconButton 
            onClick={handleRefresh} 
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <StatsSummary stats={stats} />

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={stats}
          columns={columns}
          getRowId={(row) => row.account_id}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
          autoHeight
          loading={loading}
        />
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New Account</DialogTitle>
        <DialogContent>
          <form onSubmit={(e) => e.preventDefault()}>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={formData.account_type}
                onChange={(e) => {
                  setFormData({
                    account_type: e.target.value,
                    account_name: '',
                    credentials: {}
                  });
                }}
              >
                {Object.values(ACCOUNT_TYPES).map((type) => (
                  <MenuItem key={type.name} value={type.name}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.account_type && (
              <>
                <TextField
                  fullWidth
                  required
                  label="Account Name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({
                    ...formData,
                    account_name: e.target.value
                  })}
                  sx={{ mt: 2 }}
                />

                {ACCOUNT_TYPES[formData.account_type as keyof typeof ACCOUNT_TYPES].fields.map((field) => (
                  <TextField
                    key={field}
                    fullWidth
                    required
                    label={field}
                    type={field === 'password' ? 'password' : 'text'}
                    value={formData.credentials[field] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: {
                        ...formData.credentials,
                        [field]: e.target.value
                      }
                    })}
                    sx={{ mt: 2 }}
                  />
                ))}
              </>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.account_type || !formData.account_name}
            variant="contained"
            color="primary"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App; 