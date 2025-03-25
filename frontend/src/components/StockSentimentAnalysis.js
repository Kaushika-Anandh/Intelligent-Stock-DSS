import React, { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './css/stockSentiment.css';
import TypewriterText from './TypewriterText'; // Import your new component

const StockSentimentAnalysis = () => {
  const [ticker, setTicker] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNews, setShowNews] = useState(false);

  const handleFetchAnalysis = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setError('JWT token not found.');
      return;
    }

    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch (err) {
      setError('Invalid token.');
      return;
    }

    const email = decoded.user?.email || decoded.email;
    if (!email) {
      setError('User email not found.');
      return;
    }

    if (ticker.trim() === "") {
      setError("Please enter a ticker.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/v1/news/sentiment-analysis/${ticker.trim().toUpperCase()}`, 
        { params: { email: email } }
      );
      
      console.log("API Response:", response.data);
      setAnalysisData(response.data);
    } catch (err) {
      console.error("API Error:", err);
      setError(err.response?.data?.error || "Error fetching sentiment analysis.");
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
          
          {analysisData.llm_response && (
            <>
              <p>
                <strong>Description: </strong>
                {/* Use the TypewriterText component here */}
                <TypewriterText 
                  text={analysisData.llm_response.Description_summary || "No description available"} 
                  speed={20} 
                />
              </p>
              <p>
                <strong>Insight: </strong>
                <TypewriterText 
                  text={analysisData.llm_response.Insight_summary || "No insight available"} 
                  speed={20} 
                />
              </p>
            </>
          )}

          {/* SUGGESTION DECISIONS */}
          {analysisData?.suggestion?.decisions ? (
            <div className="suggestion-section">
              <h4>Investment Recommendation</h4>
              {analysisData.suggestion.decisions.map((decision, index) => (
                <div key={index} className="decision">
                  <p>
                    <strong>Suggested Move:</strong>{" "}
                    <TypewriterText text={decision.suggestion || "No suggestion available"} speed={20} />
                  </p>
                  <p>
                    <strong>Action:</strong>{" "}
                    <TypewriterText text={decision.action || "hold"} speed={20} />
                  </p>
                  <p>
                    <strong>Ticker:</strong>{" "}
                    <TypewriterText text={decision.ticker || "N/A"} speed={20} />
                  </p>
                  <p>
                    <strong>Units:</strong>{" "}
                    <TypewriterText text={`${decision.units || 0}`} speed={20} />
                  </p>
                  <p>
                    <strong>Reason:</strong>{" "}
                    <TypewriterText text={decision.reason || "No reason provided"} speed={20} />
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No suggestions available</p>
          )}

          {/* NEWS LINKS */}
          <button 
            className="news-toggle-btn"
            onClick={() => setShowNews(!showNews)}
          >
            {showNews ? "Hide News Links" : "Show News Links"}
          </button>
          
          {showNews && analysisData.news_links && analysisData.news_links.length > 0 ? (
            <ul className="news-links">
              {analysisData.news_links.map((link, index) => (
                <li key={index}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          ) : showNews && (
            <p>No news links available</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSentimentAnalysis;
