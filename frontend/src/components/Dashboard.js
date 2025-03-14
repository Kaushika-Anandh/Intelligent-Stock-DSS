// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import UserLogContainer from './UserLogContainer';

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState({});
  const [newStock, setNewStock] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // On component mount, decode JWT to get email and fetch the portfolio.
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setError("JWT token not found.");
      setLoading(false);
      return;
    }
    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch (err) {
      setError("Invalid token.");
      setLoading(false);
      return;
    }
    const email = decoded.user?.email;
    if (!email) {
      setError("User email not found in token.");
      setLoading(false);
      return;
    }
    // Fetch current portfolio
    axios.get(`http://localhost:5000/api/v1/user/portfolio?email=${encodeURIComponent(email)}`)
      .then(response => {
         setPortfolio(response.data.portfolio);
         setLoading(false);
      })
      .catch(err => {
         setError("Error fetching portfolio.");
         setLoading(false);
      });
  }, []);

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

  // Add a new stock entry to the portfolio (in local state)
  const handleAddStock = async () => {
    if (newStock.trim() === "" || newVolume.trim() === "") {
        setError("Both stock name and volume are required.");
        return;
      }
      const volumeNum = parseFloat(newVolume);
      if (isNaN(volumeNum) || volumeNum <= 0) {
        setError("Volume must be a positive number.");
        return;
      }
      
      // Validate the ticker using the external API.
      const isValidTicker = await validateTicker(newStock.trim());
      if (!isValidTicker) {
        setError("Invalid ticker symbol.");
        return;
      }
    setPortfolio(prev => ({
      ...prev,
      [newStock.trim()]: volumeNum
    }));
    setNewStock("");
    setNewVolume("");
    setError("");
  };

  // Remove a stock from the portfolio
  const handleRemoveStock = (stockName) => {
    const updatedPortfolio = { ...portfolio };
    delete updatedPortfolio[stockName];
    setPortfolio(updatedPortfolio);
  };

  // Update (save) the portfolio on the backend
  const handleSavePortfolio = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setError("JWT token not found.");
      return;
    }
    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch (err) {
      setError("Invalid token.");
      return;
    }
    const email = decoded.user?.email;
    if (!email) {
      setError("User email not found in token.");
      return;
    }
    axios.post('http://localhost:5000/api/v1/user/portfolio', {
      email: email,
      portfolio: portfolio
    })
    .then(response => {
      alert("Portfolio updated successfully.");
      // Optionally, redirect or update state
    })
    .catch(err => {
      setError("Error saving portfolio.");
    });
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard - Create Your Portfolio</h2>
      {error && <div style={{color: 'red'}}>{error}</div>}
      
      <div className="portfolio-list">
        <h3>Your Portfolio</h3>
        {Object.keys(portfolio).length === 0 ? (
          <p>No stocks added yet.</p>
        ) : (
          <ul>
            {Object.entries(portfolio).map(([stock, volume]) => (
              <li key={stock}>
                <span>{stock}: {volume}</span>
                <button onClick={() => handleRemoveStock(stock)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="add-stock-section">
        <h3>Add Stock</h3>
        <input
          type="text"
          placeholder="Stock Name"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
        />
        <input
          type="text"
          placeholder="Volume"
          value={newVolume}
          onChange={(e) => setNewVolume(e.target.value)}
        />
        <button onClick={handleAddStock}>Add</button>
      </div>

      <div className="save-portfolio">
        <button onClick={handleSavePortfolio}>Save Portfolio</button>
      </div>
      <div className="user-logs-section">
        <UserLogContainer />
      </div>
    </div>
  );
};

export default Dashboard;
