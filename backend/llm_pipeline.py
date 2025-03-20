import requests, json, os
from groq import Groq # type: ignore
from config import NEWS_SUMMARY_USER_PROMPT, NEWS_SUMMARY_SYSTEM_PROMPT, SUGGESTION_CONTEXT_PROMPT, SUGGESTION_SYSTEM_PROMPT
from langchain_groq import ChatGroq # type: ignore
from langchain_core.prompts import ChatPromptTemplate # type: ignore

def get_desc_insights(ticker):

    API_KEY = os.environ.get('POLYGONIO_KEY')
    url = f"https://api.polygon.io/v2/reference/news?ticker={ticker}&limit=3&apiKey={API_KEY}"
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return False
        news_insights = []
        news_links = []
        descriptions = ""
        for result in response.json()["results"]:
            descriptions += result["description"] + "\n"
            news_insights.append(result["insights"])
            news_links.append(result["article_url"])

        return descriptions, str(news_insights), news_links
    except Exception as e:
        print(e)
        return False

def chat_groq(description, insights):
    try:
        client = Groq(api_key=os.environ.get("GROQ_NEWS_SUMMARY_APU")) 
        chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": NEWS_SUMMARY_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": NEWS_SUMMARY_USER_PROMPT.format(DESCRIPTION = description, INSIGHTS = insights),
            }
        ],
        model="llama-3.3-70b-versatile")

        print(chat_completion.choices[0].message.content)
        llm_response = chat_completion.choices[0].message
        llm_response_json = llm_response.content[llm_response.content.find('{'):llm_response.content.rfind('}')+1]
        return json.loads(llm_response_json)
    except Exception as e:
        print(e)

