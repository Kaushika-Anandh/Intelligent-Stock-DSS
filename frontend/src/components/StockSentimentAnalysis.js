// src/components/StockSentimentAnalysis.js
import React, { useState } from 'react';
import axios from 'axios';
import './css/stockSentiment.css'; // Import the new CSS

const StockSentimentAnalysis = () => {
  const [ticker, setTicker] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNews, setShowNews] = useState(false);

  const handleFetchAnalysis = async () => {
    if (ticker.trim() === "") {
      setError("Please enter a ticker.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Convert the ticker to uppercase and call the API.
      const response = await axios.get(
        `http://localhost:5000/api/v1/news/sentiment-analysis/${ticker.trim().toUpperCase()}`
      );
      setAnalysisData(response.data);
    } catch (err) {
      console.error(err);
      setError("Error fetching sentiment analysis.");
    }
    setLoading(false);
  };

  return (
    <div className="stock-sentiment-container">
      <h2>Stock News Sentiment Analysis</h2>

      <div className="analysis-row">
        <input 
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker (e.g., AAPL)"
        />
        <button onClick={handleFetchAnalysis}>
          Get Analysis
        </button>
      </div>

      {loading && <p className="loading-message">Loading analysis...</p>}
      {error && <p className="error-message">{error}</p>}

      {analysisData && (
        <div className="analysis-summary">
          <h3>Analysis Summary</h3>
          <p>
            <strong>Description:</strong> {analysisData.llm_response?.Description_summary}
          </p>
          <p>
            <strong>Insight:</strong> {analysisData.llm_response?.Insight_summary}
          </p>
          <button 
            className="news-toggle-btn"
            onClick={() => setShowNews(!showNews)}
          >
            {showNews ? "Hide News Links" : "Show News Links"}
          </button>
          {showNews && (
            <ul className="news-links">
              {analysisData.news_links?.map((link, index) => (
                <li key={index}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSentimentAnalysis;
