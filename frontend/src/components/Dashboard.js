// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Note: remove the curly braces around jwtDecode
import UserLogContainer from './UserLogContainer';
import StockSentimentAnalysis from './StockSentimentAnalysis';
import './css/dashboard.css'; // Import the new CSS

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState({});
  const [newStock, setNewStock] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal toggles
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

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
    axios
      .get(`http://localhost:5000/api/v1/user/portfolio?email=${encodeURIComponent(email)}`)
      .then((response) => {
        setPortfolio(response.data.portfolio);
        setLoading(false);
      })
      .catch((err) => {
        setError("Error fetching portfolio.");
        setLoading(false);
      });
  }, []);

  const validateTicker = async (ticker) => {
    try {
      // Fetch the list of valid tickers.
      const response = await axios.get('https://api.financialdatasets.ai/financial-metrics/tickers/');
      const tickers = response.data['tickers'];
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
    setPortfolio((prev) => ({
      ...prev,
      [newStock.trim()]: volumeNum,
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
    axios
      .post('http://localhost:5000/api/v1/user/portfolio', {
        email: email,
        portfolio: portfolio,
      })
      .then((response) => {
        alert("Portfolio updated successfully.");
      })
      .catch((err) => {
        setError("Error saving portfolio.");
      });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      <h2>Dashboard - Manage Your Portfolio</h2>
      {error && <div className="error-message">{error}</div>}

      {/* Card: Add Stock Section */}
      <div className="card">
        <h3>Add Stock</h3>
        <div className="add-stock-row">
          <input
            type="text"
            placeholder="Stock Ticker"
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
        <button onClick={handleSavePortfolio} className="save-portfolio-btn">
          Save Portfolio
        </button>
      </div>

      {/* Card: Stock Sentiment Analysis */}
      <div className="card">
        <h3>Stock News Sentiment Analysis</h3>
        <StockSentimentAnalysis />
      </div>

      {/* Buttons to open modals for Portfolio & Logs */}
      <div className="modal-buttons">
        <button onClick={() => setShowPortfolioModal(true)}>View Portfolio</button>
        <button onClick={() => setShowLogsModal(true)}>View Logs</button>
      </div>

      {/* Modal: Portfolio */}
      {showPortfolioModal && (
        <div className="modal-overlay" onClick={() => setShowPortfolioModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Your Portfolio</h3>
              <button className="close-btn" onClick={() => setShowPortfolioModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {Object.keys(portfolio).length === 0 ? (
                <p>No stocks added yet.</p>
              ) : (
                <ul className="portfolio-list">
                  {Object.entries(portfolio).map(([stock, volume]) => (
                    <li key={stock}>
                      <span>
                        {stock}: {volume}
                      </span>
                      <button onClick={() => handleRemoveStock(stock)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Logs */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Logs</h3>
              <button className="close-btn" onClick={() => setShowLogsModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <UserLogContainer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
