import os
import requests

# TODO
def ticker_news_sentiment(ticker):

    API_KEY = os.environ.get('SECRET_KEY')
    url = f"https://api.polygon.io/v2/reference/news?ticker={ticker}&limit=3&apiKey={API_KEY}"
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return False
        news_desc_insights = []
        news_link = []
        for result in response.json()["results"]:
            news_desc_insights.append({"desc":result["description"], "insight":result["insights"]})
            news_link.append(result["article_url"])
        return
    except Exception as e:
        print(e)
        return False

def chat_groq(description, insights):
    return 