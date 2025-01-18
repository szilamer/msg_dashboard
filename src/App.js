import React, { useEffect, useCallback, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const App = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllAccounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/accounts`);
      if (!response.ok) throw new Error('Hiba a fiókok betöltésekor');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Hiba a fiókok betöltésekor:', error);
      setError(error.message);
    }
  }, []);

  const handleAddAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Új WhatsApp fiók hozzáadása kezdődik...');
      const response = await fetch(`${API_BASE}/accounts/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Szerver válasz:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Hiba a fiók létrehozásakor');
      }

      console.log('Új fiók létrehozva:', data);
      await fetchAllAccounts();
      
    } catch (error) {
      console.error('Részletes hiba:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
    const interval = setInterval(fetchAllAccounts, 5000);
    return () => clearInterval(interval);
  }, [fetchAllAccounts]);

  return (
    <div className="container">
      <h1>WhatsApp Fiókok</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <button 
        onClick={handleAddAccount}
        disabled={loading}
        className="add-button"
      >
        {loading ? 'WhatsApp fiók hozzáadása folyamatban...' : 'Új WhatsApp fiók hozzáadása'}
      </button>

      <div className="accounts-list">
        {accounts.length === 0 && !loading && (
          <p>Még nincsenek WhatsApp fiókok hozzáadva.</p>
        )}
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <h3>{account.name || 'Névtelen fiók'}</h3>
            <p>Státusz: {account.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App; 