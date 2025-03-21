import requests, json, os, datetime
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

def fetch_open_close_tuples(ticker, n_days):
    """
    Fetches stock aggregate data from the Polygon API for a given ticker
    over a period starting from (yesterday - n_days) to yesterday, and returns
    a list of tuples (open, close) for each day.
    
    Args:
        ticker (str): The stock ticker symbol (e.g., 'AAPL').
        n_days (int): Number of days back from yesterday to start the range.
        api_key (str): Your Polygon API key.
    
    Returns:
        list of tuple: Each tuple contains (open, close) values.
    """
    API_KEY = os.environ.get('POLYGONIO_KEY')
    # Calculate yesterday's date as the end date.
    end_date = datetime.date.today() - datetime.timedelta(days=1)
    # Calculate start date as N days before yesterday.
    start_date = end_date - datetime.timedelta(days=n_days)
    
    # Format dates as YYYY-MM-DD.
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")
    
    url = (
        f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/"
        f"{start_date_str}/{end_date_str}?adjusted=true&sort=asc&limit=120&apiKey={API_KEY}"
    )
    
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Error calling API: {response.text}")
    
    data = response.json()
    results = data.get("results", [])
    return [(item["o"], item["c"]) for item in results if "o" in item and "c" in item]

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
        return False
    
def chat_deepseek(description, insights, portfolio, 
                  user_profile, portfolio_logs, 
                  window_days, context):
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY_V2")
    try:
        llm = ChatGroq(
            model_name="deepseek-r1-distill-llama-70b",
            temperature=0.7,
            api_key=GROQ_API_KEY
        )

        followup_prompt = ChatPromptTemplate.from_messages([
            ("system", SUGGESTION_SYSTEM_PROMPT),
            ("user", SUGGESTION_CONTEXT_PROMPT.format(Description_summary = description, Insight_summary = insights, portfolio = portfolio, 
                                                      user_profile = user_profile, context = context, 
                                                      portfolio_logs = portfolio_logs, window_days = window_days))
        ])
        response_chain = followup_prompt | llm
        llm_response = response_chain.invoke()
        print("Raw LLM response:", llm_response.content)
        
        # More robust JSON extraction
        try:
            # First attempt: try to find JSON between braces
            start_idx = llm_response.content.find('{')
            end_idx = llm_response.content.rfind('}')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                llm_response_json = llm_response.content[start_idx:end_idx+1]
                result = json.loads(llm_response_json)
            else:
                # Fallback: return a properly structured response
                result = {
                    "suggestion": "Unable to determine a suggestion at this time.",
                    "action": "hold",
                    "units": 0,
                    "reason": "The analysis system encountered difficulty processing the market data."
                }
                
            # Ensure all required fields exist
            if "suggestion" not in result:
                result["suggestion"] = result.get("recommendation", "No specific suggestion available")
            if "action" not in result:
                result["action"] = result.get("recommended_action", "hold")
            if "units" not in result:
                result["units"] = result.get("quantity", 0)
            if "reason" not in result:
                result["reason"] = result.get("rationale", "No specific reason provided")
                
            return result
                
        except json.JSONDecodeError as je:
            print(f"JSON parsing error: {je}")
            # Return a properly structured response on JSON error
            return {
                "suggestion": "Unable to process market analysis at this time.",
                "action": "hold",
                "units": 0,
                "reason": "There was an error processing the market data."
            }
    except Exception as e:
        print(f"Deepseek API error: {e}")
        # Return a properly structured response on any error
        return {
            "suggestion": "Error connecting to analysis service.",
            "action": "hold", 
            "units": 0,
            "reason": f"Service error: {str(e)}"
        }