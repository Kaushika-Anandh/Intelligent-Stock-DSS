// src/components/UserLogsContainer.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const UserLogContainer = () => {
  const [activity, setActivity] = useState('BUY'); // Default option
  const [stockTicker, setStockTicker] = useState('');
  const [volume, setVolume] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  // Helper to decode the JWT and extract the email.
  const getEmailFromToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded.user?.email;
    } catch (err) {
      console.error("Invalid token", err);
      return null;
    }
  };

  // Function to fetch previous logs for the current user.
  const fetchLogs = () => {
    const email = getEmailFromToken();
    if (!email) {
      setError('User email not found in token.');
      return;
    }
    axios
      .get(`http://localhost:5000/api/v1/user/logs?email=${encodeURIComponent(email)}`)
      .then((response) => {
        setLogs(response.data.logs);
      })
      .catch((err) => {
        console.error(err);
        setError('Error fetching logs.');
      });
  };

   // Validate the ticker using the external API.
   const validateTicker = async (ticker) => {
    try {
      // Fetch the list of valid tickers.
        const response = await axios.get('https://api.financialdatasets.ai/financial-metrics/tickers/');
        const tickers = response.data['tickers']; // Assumes tickers is an array sorted in ascending order.
        const target = ticker.toUpperCase();

        let low = 0;
        let high = tickers.length - 1;

        while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (tickers[mid] === target) {
            return true; // Ticker found.
        } else if (tickers[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
            }
        }
        return false;
    } catch (err) {
      console.error("Error validating ticker:", err);
      return false;
    }
  };

  // Fetch logs on component mount.
  useEffect(() => {
    
    fetchLogs();// eslint-disable-next-line
  }, []);

  // Submit a new log entry.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = getEmailFromToken();
    if (!email) {
      setError('User email not found in token.');
      return;
    }
    // Ensure stock ticker is provided.
    if (stockTicker.trim() === "") {
        setError("Stock ticker is required.");
        return;
      }
  
      // Validate the ticker symbol.
      const isValidTicker = await validateTicker(stockTicker.trim());
      if (!isValidTicker) {
        setError("Invalid ticker symbol.");
        return;
      }

    // Build the payload.
    const payload = {
      email: email,
      activity: activity,
      stock_ticker: stockTicker,
      volume: parseFloat(volume),
    };

    axios
      .post('http://localhost:5000/api/v1/user/logs', payload)
      .then((response) => {
        // Clear the input fields.
        setStockTicker('');
        setVolume('');
        // Refresh logs.
        fetchLogs();
      })
      .catch((err) => {
        console.error(err);
        setError('Error submitting log.');
      });
  };

  return (
    <div
      className="user-logs-container"
      style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}
    >
      <h2>User Logs</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Form for entering a new log */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="activity">Activity: </label>
          <select
            id="activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="HOLD">HOLD</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="stockTicker">Stock Ticker: </label>
          <input
            type="text"
            id="stockTicker"
            value={stockTicker}
            onChange={(e) => setStockTicker(e.target.value)}
            placeholder="e.g., AAPL"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <label htmlFor="volume">Volume: </label>
            <input
                type="number"
                id="volume"
                value={volume}
                onChange={(e) => {
                const value = e.target.value;
                // Optionally enforce positive values through logic
                if (value < 0) {
                    setVolume(0);
                } else {
                    setVolume(value);
                }
                }}
                placeholder="e.g., 10"
                min="0"
            />
        </div>
        <button type="submit">Add Log</button>
      </form>

      {/* Display previous logs */}
      <h3>Previous Logs</h3>
      {logs.length === 0 ? (
        <p>No logs available.</p>
      ) : (
        <ul>
          {logs.map((log) => (
            <li key={log.log_id} style={{ marginBottom: '8px' }}>
              <strong>{log.activity}</strong> - {log.stock_ticker} : {log.volume}{' '}
              at {new Date(log.activity_time).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
      <button onClick={fetchLogs}>Refresh Logs</button>
    </div>
  );
};

export default UserLogContainer;
