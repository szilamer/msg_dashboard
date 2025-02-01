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
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Axios instance létrehozása egyedi konfigurációval
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

interface AccountStats {
  account_id: number;
  account_name: string;
  account_type: string;
  total_messages: number;
  unread_messages: number;
  last_unread_date: string;
  last_updated: string;
  id?: string;
}

interface TimeSeriesData {
  timestamp: string;
  total_messages: number;
  unread_messages: number;
  new_messages: number;
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
    fields: ['client_id', 'client_secret']
  }
};

const columns: GridColDef[] = [
  { 
    field: 'account_name', 
    headerName: 'Account Name', 
    width: 150,
    flex: 1 
  },
  { 
    field: 'account_type', 
    headerName: 'Account Type', 
    width: 130,
    flex: 1 
  },
  { 
    field: 'total_messages', 
    headerName: 'Total Messages', 
    width: 130, 
    type: 'number',
    flex: 1,
    valueFormatter: (params) => params.value.toLocaleString('en-US')
  },
  { 
    field: 'unread_messages', 
    headerName: 'Unread Messages', 
    width: 160, 
    type: 'number',
    flex: 1,
    valueFormatter: (params) => params.value.toLocaleString('en-US')
  },
  { 
    field: 'last_unread_date', 
    headerName: 'Oldest Unread', 
    width: 200,
    flex: 1,
    valueFormatter: (params) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleString('en-US');
    }
  },
  { 
    field: 'last_updated', 
    headerName: 'Last Updated', 
    width: 200,
    flex: 1,
    valueFormatter: (params) => {
      return new Date(params.value).toLocaleString('en-US');
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    flex: 0.5,
    renderCell: (params) => (
      <IconButton
        onClick={() => params.row.onDelete(params.row.account_id)}
        color="error"
        size="small"
      >
        <DeleteIcon />
      </IconButton>
    ),
  },
];

const StatsSummary = ({ stats }: { stats: AccountStats[] }) => {
  const totalMessages = stats.reduce((sum, stat) => sum + stat.total_messages, 0);
  const totalUnread = stats.reduce((sum, stat) => sum + stat.unread_messages, 0);
  const accountCount = stats.length;

  const oldestUnreadDate = stats.reduce((oldest, stat) => {
    if (!stat.last_unread_date) return oldest;
    if (!oldest) return stat.last_unread_date;
    return new Date(stat.last_unread_date) < new Date(oldest) ? stat.last_unread_date : oldest;
  }, null as string | null);

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Paper sx={{ p: 2, flex: 1, minWidth: '200px', backgroundColor: '#f8f9fa' }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          <MessageIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            {totalMessages.toLocaleString('en-US')}
          </Typography>
        </Box>
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Total Messages
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, flex: 1, minWidth: '200px', backgroundColor: '#f8f9fa' }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          <MarkEmailUnreadIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography variant="h6">
            {totalUnread.toLocaleString('en-US')}
          </Typography>
        </Box>
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Unread Messages
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, flex: 1, minWidth: '200px', backgroundColor: '#f8f9fa' }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          <Typography variant="h6">
            {oldestUnreadDate ? new Date(oldestUnreadDate).toLocaleString('en-US') : '-'}
          </Typography>
        </Box>
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Oldest Unread
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, flex: 1, minWidth: '200px', backgroundColor: '#f8f9fa' }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1} flexWrap="wrap">
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
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Active Accounts
        </Typography>
      </Paper>
    </Box>
  );
};

function App() {
  const [stats, setStats] = useState<AccountStats[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
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
      const response = await api.get<AccountStats[]>('/stats');
      
      // Csak a legfrissebb adatok megtartása fiókonként
      const latestStats = Object.values(
        response.data.reduce((acc, stat) => {
          const key = `${stat.account_type}_${stat.account_id}`;
          if (!acc[key] || new Date(stat.last_updated) > new Date(acc[key].last_updated)) {
            acc[key] = {
              ...stat,
              id: key,
              onDelete: (accountId: number) => handleDeleteAccount(accountId)
            };
          }
          return acc;
        }, {} as Record<string, AccountStats & { onDelete: (accountId: number) => void }>)
      );

      setStats(latestStats);

      // Idősorozat adatok frissítése
      const currentTotal = latestStats.reduce((sum, stat) => sum + stat.total_messages, 0);
      const currentUnread = latestStats.reduce((sum, stat) => sum + stat.unread_messages, 0);
      
      setTimeSeriesData(prevData => {
        const newData = [...prevData];
        const timestamp = new Date().toISOString();
        const previousTotal = prevData.length > 0 ? prevData[prevData.length - 1].total_messages : 0;
        
        newData.push({
          timestamp,
          total_messages: currentTotal,
          unread_messages: currentUnread,
          new_messages: currentTotal - previousTotal
        });

        // Csak az utolsó 24 óra adatait tartjuk meg
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return newData.filter(data => new Date(data.timestamp) > twentyFourHoursAgo);
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(async (accountId: number) => {
    try {
      await api.delete(`/accounts/${accountId}`);
      setStats(prevStats => prevStats.filter(stat => stat.account_id !== accountId));
      await fetchStats();
    } catch (error) {
      console.error('Error deleting account:', error);
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
      const response = await api.post('/stats/refresh');
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
      const requiredFields = ACCOUNT_TYPES[formData.account_type as keyof typeof ACCOUNT_TYPES]?.fields || [];
      const missingFields = requiredFields.filter(field => !formData.credentials[field]);
      
      if (missingFields.length > 0) {
        setError(`Please fill in the following fields: ${missingFields.join(', ')}`);
        return;
      }

      console.log('Sending data:', formData);
      
      const response = await api.post('/accounts', formData);
      console.log('Backend response:', response.data);
      
      setOpenDialog(false);
      setFormData({
        account_type: '',
        account_name: '',
        credentials: {}
      });

      console.log("Starting immediate refresh after account creation...");
      await api.post('/stats/refresh');
      await fetchStats();
      
    } catch (error: any) {
      console.error('Error details:', error.response?.data || error);
      setError(error.response?.data?.detail || 'Error creating account');
    }
  };

  const chartData = {
    labels: timeSeriesData.map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'New Messages',
        data: timeSeriesData.map(data => data.new_messages),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Unread Messages',
        data: timeSeriesData.map(data => data.unread_messages),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Message Trends'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Message Statistics Dashboard
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
            disabled={loading}
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

      <Box sx={{ mb: 4 }}>
        <StatsSummary stats={stats} />
      </Box>

      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Message Trends
            </Typography>
            <Box sx={{ height: 400 }}>
              <Line data={chartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Account Details
            </Typography>
            <DataGrid
              rows={stats}
              columns={columns}
              getRowId={(row) => row.id}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 },
                },
                sorting: {
                  sortModel: [{ field: 'account_name', sort: 'asc' }],
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              loading={loading}
              sx={{ 
                minHeight: 400,
                '& .MuiDataGrid-cell': {
                  fontSize: '0.95rem',
                },
                '& .MuiDataGrid-columnHeader': {
                  backgroundColor: '#f5f5f5',
                  fontWeight: 'bold',
                }
              }}
            />
          </Paper>
        </Grid>
      </Grid>

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