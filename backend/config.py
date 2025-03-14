import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key_here'
    # Configure JWT expiration duration (e.g., 1 day)
    JWT_EXPIRATION_DELTA = timedelta(days=1)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://username:password@localhost/yourdbname'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

NEWS_SUMMARY_SYSTEM_PROMPT="""You are an AI assistant that help user to summarize long content"""
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