import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key_here'
    # Configure JWT expiration duration (e.g., 1 day)
    JWT_EXPIRATION_DELTA = timedelta(days=1)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://username:password@localhost/yourdbname'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

BEHAVIOR_CONTEXT = {
    "Conservative": {
        "final_score": (0, 3.5),
        "description": "Prefers stable investments with minimal risk. Prioritizes capital preservation over growth."
    },
    "Balanced": {
        "final_score": (3.5, 6.5),
        "description": "Mix of growth and stability. Seeks moderate returns with managed risk exposure."
    },
    "Aggressive": {
        "final_score": (6.5, 10),
        "description": "High-risk tolerance for potentially higher returns. Comfortable with market volatility."
    }
}

NEWS_SUMMARY_SYSTEM_PROMPT="""You are an AI assistant that help user to summarize long content."""
NEWS_SUMMARY_USER_PROMPT="""Given few description about stock market news, Understand all the news and summarize the content with all the essential details.
You are also given a list of insights based on the stock news. These insights contains stock ticker and coressponding sentiment about the news.
There is also reason for the sentiment. Understand the news description, insights and summarize the content. *Make it crisp*, *DO NOT ADD ANY NEW CONTENT*.
Description:
{DESCRIPTION}
Insights:
{INSIGHTS}
The output should be in JSON format. This output should strictly follow this structure:
{{
    "Description_summary": "...summary...",
    "Insight_summary": "...summary..."
}}"""

SUGGESTION_SYSTEM_PROMPT = "You are a personal financial analyst providing suggestion for the user's portfolio."
SUGGESTION_CONTEXT_PROMPT = """Act as a financial analyst AI using these inputs:
- Portfolio(ticker: units owned):  {portfolio} .
- News: {Description_summary} + {Insight_summary}.
- User data: behavior: {user_profile}, \nhistory: {portfolio_logs}, \nbias explanations: {context}.
- ticker stock prices: {window_days} 

Steps:
1. Technical: Analyze trends (50-day vs 100-day) from ticker stock prices, volatility, RSI.
2. News: Correlate price action with news.
3. Behavior: Adjust per behavior and bias explanations.

Rules:
- Sell if downtrend, negative news, and loss tolerance shown in history.
- Buy if uptrend, positive news, and risk tolerance per {user_profile["risk_tolerance"]}.
- Hold if signals conflict or user is conservative.
- Limit suggestions to ≤20% per ticker unless {portfolio["concentration_ok"]} is true.

Output only this JSON:
{{
  "decisions": [
    {{
      "ticker": "TICKER",
      "action": "buy/sell/hold",
      "units": integer,
      "suggestion": "Max 12-word summary",
      "reason": "[Technical] ... [News] ... [Behavior] ..."
    }}
  ]
}}

Example:
{{  
  "decisions": [  
    {{  
      "ticker": "NVDA",  
      "action": "hold",  
      "units": 0,  
      "suggestion": "Await clearer signals post-earnings",  
      "reason": "[Technical] RSI 68 (neutral); [News] {Insight_summary} mentions supply chain uncertainty; [Behavior] {user_analysis} shows aversion to earnings volatility"  
    }}  
  ]  
}} 
**Do not include explanations, notes, or text outside the JSON.**
"""