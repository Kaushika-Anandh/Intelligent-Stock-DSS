# app.py (Flask backend)
from flask import request, jsonify, Blueprint 
import os
import json
import time
import statistics
from langchain_groq import ChatGroq # type: ignore
from langchain_core.prompts import ChatPromptTemplate # type: ignore
from flask_cors import CORS # type: ignore

GROQ_API_KEY = os.getenv("GROQ_FOLLOW_API_KEY")

followup_bp = Blueprint('followup_bp', __name__)

# Initialize LLM
llm = ChatGroq(
    model_name="deepseek-r1-distill-llama-70b",
    temperature=0.7,
    api_key=GROQ_API_KEY
)

# Define Risk Profiles
RISK_PROFILES = {
    "Conservative": {
        "range": (0, 3.5),
        "description": "Prefers stable investments with minimal risk. Prioritizes capital preservation over growth."
    },
    "Balanced": {
        "range": (3.5, 6.5),
        "description": "Mix of growth and stability. Seeks moderate returns with managed risk exposure."
    },
    "Aggressive": {
        "range": (6.5, 10),
        "description": "High-risk tolerance for potentially higher returns. Comfortable with market volatility."
    }
}

# Enhanced Follow-up Question Generation Prompt
followup_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a financial analyst determining a user's risk profile."),
    ("user", 
        "Act as a financial analyst. The user showed ambiguity in {category} through: {context}. "
        "Generate 2-3 MCQs to clarify their true preferences. "
        "Focus on {specific_subaspect} based on their pattern: {pattern_details}. "
        "Context: User answered '{last_answer}' (score {last_score}) to the question: '{last_question}'. "
        "Pattern detected: {pattern}. Focus on clarifying: {aspect_to_clarify}. "
        "Return **only** a JSON object in the following format:\n"
        "```\n"
        "{{ \"follow_up_questions\": [\n"
        "   {{\"question\": \"Your question here\", \"options\": [\n"
        "      {{\"option\": \"Choice 1\", \"score\": 5}},\n"
        "      {{\"option\": \"Choice 2\", \"score\": 3}},\n"
        "      {{\"option\": \"Choice 3\", \"score\": 1}},\n"
        "      {{\"option\": \"Choice 4\", \"score\": 0}}\n"
        "   ]}}\n"
        " ]}}\n"
        "```"
        "Do **not** include any explanations, text, or extra characters outside the JSON format."
    )
])
followup_chain = followup_prompt | llm

# Load Questions
def load_questions(filepath="core_questions.json"):
    with open(filepath, "r") as f:
        return json.load(f)

# Ensure storage directory exists
def ensure_storage_dirs():
    """Create storage directories if they don't exist."""
    os.makedirs("storage", exist_ok=True)
    os.makedirs("storage/user_profiles", exist_ok=True)
    
    # Initialize empty files if they don't exist
    for file in ["core_responses.json", "followup_responses.json"]:
        if not os.path.exists(f"storage/{file}"):
            with open(f"storage/{file}", "w") as f:
                json.dump({}, f)

ensure_storage_dirs()
questions = load_questions()

# Group Questions by Category
questions_by_category = {}
for q in questions:
    questions_by_category.setdefault(q["category"], []).append(q)

# Define Order of Categories
category_order = ["type_of_trader", "risk_appetite", "experience", "budget_appetite"]

# Scoring Weights
SCORING_WEIGHTS = {
    "type_of_trader": 0.30,
    "risk_appetite": 0.30,
    "experience": 0.25,
    "budget_appetite": 0.15
}

# Utility Functions
def calculate_average(scores):
    """Calculate the average score for a category."""
    print("scores",scores)
    return round(statistics.mean(scores), 2) if scores else 0

def apply_weighting(scores):
    """Apply weightings to final scores."""
    return {cat: round(scores.get(cat, 0) * weight, 2) for cat, weight in SCORING_WEIGHTS.items()}

def calculate_final_score(weighted_scores, followup_confidence):
    """Calculate final score with followup confidence adjustment."""
    core_score = sum(weighted_scores.values())
    return core_score * (0.8 + followup_confidence)

def get_risk_profile(score):
    """Get risk profile based on final score."""
    for profile, data in RISK_PROFILES.items():
        low, high = data["range"]
        if low <= score < high:
            return profile, data["description"]
    return "Unknown", "Unable to determine risk profile."

def is_ambiguous(score, lower=4.0, upper=6.0):
    """Check if a score is ambiguous."""
    return lower < score < upper

def detect_ambiguity_patterns(response_history, extreme_answer_count):
    """Detect additional ambiguity patterns in responses."""
    # Check if we have at least 3 responses
    if len(response_history) < 3:
        return False, "", ""
    
    # Check for high variance in recent answers
    recent_scores = [item["score"] for item in response_history[-3:]]
    variance = statistics.variance(recent_scores) if len(recent_scores) > 1 else 0
    
    if variance > 9:  # Variance threshold for 3+ point differences
        return True, "high_variance", "inconsistent responses across similar questions"
    
    # Check for extreme answers (min/max scores)
    if extreme_answer_count >= 3:
        return True, "extreme_answers", "tendency to select extreme options"
    
    return False, "", ""

def get_aspect_to_clarify(category, pattern):
    """Determine which aspect to focus on for follow-up questions."""
    aspect_mapping = {
        "type_of_trader": {
            "high_variance": "trading frequency and timeframe",
            "extreme_answers": "certainty in trading style",
            "ambiguous_score": "preferred trading approach"
        },
        "risk_appetite": {
            "high_variance": "risk tolerance during market volatility",
            "extreme_answers": "consistency in risk preferences",
            "ambiguous_score": "comfort with potential losses"
        },
        "experience": {
            "high_variance": "investment knowledge depth",
            "extreme_answers": "confidence in investment decisions",
            "ambiguous_score": "practical experience level"
        },
        "budget_appetite": {
            "high_variance": "spending priorities",
            "extreme_answers": "budget flexibility",
            "ambiguous_score": "allocation preferences"
        }
    }
    
    return aspect_mapping.get(category, {}).get(pattern, "general preferences")

def generate_followup(category, context_info):
    """Generate follow-up questions dynamically."""
    try:
        # Invoke LLM for follow-up questions
        print(category)
        output = followup_chain.invoke(context_info)
        
        if not output or not output.content.strip():
            return {"error": "Empty response from the model"}

        # Sanitize and parse JSON response
        sanitized_json = output.content[output.content.find('{'):output.content.rfind('}')+1]
        followup_data = json.loads(sanitized_json)
        
        # Validate schema
        if "follow_up_questions" not in followup_data:
            return {"error": "Invalid response format"}
            
        return followup_data
    except json.JSONDecodeError:
        return {"error": "Invalid JSON format received"}
    except Exception as e:
        return {"error": f"Error generating follow-up: {str(e)}"}

# API Endpoints
@followup_bp.route('/questions', methods=['GET'])
def get_questions():
    """Return all questions grouped by category."""
    return jsonify({
        "questions_by_category": questions_by_category,
        "category_order": category_order
    })

@followup_bp.route('/submit_answer', methods=['POST'])
def submit_answer():
    """Process a user's answer and determine if follow-up is needed."""
    data = request.json
    print("data",data)
    
    # Extract data from request
    category = data.get('category')
    question_index = data.get('question_index')
    response = data.get('response')
    score = data.get('score')
    response_history = data.get('response_history', [])
    extreme_answer_count = data.get('extreme_answer_count', 0)
    category_scores = data.get('category_scores', {})
    
    # Add response to history
    response_data = {
        "question": data.get('question'),
        "answer": response,
        "score": score,
        "category": category,
        "question_index": question_index
    }
    response_history.append(response_data)
    
    # Check if this is the last question in the category
    category_questions = questions_by_category.get(category, [])
    print("cat",len(category_questions))
    print("ques", question_index)
    is_last_question = question_index >= len(category_questions) - 1
    
    result = {
        "is_last_question": is_last_question,
        "response_history": response_history,
        "extreme_answer_count": extreme_answer_count
    }
    if category not in category_scores:
        category_scores[category] = [score]
    else:
        category_scores[category].append(score)

    if is_last_question:
        # Calculate category score
        if category not in category_scores:
            category_scores[category] = []
        category_score = calculate_average(category_scores[category])
        
        # Check for ambiguity
        score_ambiguous = is_ambiguous(category_score)
        pattern_ambiguous, pattern_type, pattern_details = detect_ambiguity_patterns(
            response_history, extreme_answer_count
        )
        
        if score_ambiguous or pattern_ambiguous:
            # Get context for follow-up generation
            last_question = category_questions[question_index]["question"] if question_index >= 0 else ""
            last_answer = response_history[-1]["answer"] if response_history else ""
            last_score = response_history[-1]["score"] if response_history else 0
            
            # Determine ambiguity pattern
            if score_ambiguous:
                pattern = "ambiguous_score"
                pattern_details = f"score of {category_score} falls in ambiguous range (4-6)"
            else:
                pattern = pattern_type
            
            # Determine aspect to clarify
            aspect_to_clarify = get_aspect_to_clarify(category, pattern)
            
            # Generate follow-up questions
            context_info = {
                "category": category,
                "context": f"score of {category_score}" if score_ambiguous else pattern_details,
                "specific_subaspect": aspect_to_clarify,
                "pattern_details": pattern_details,
                "last_question": last_question,
                "last_answer": last_answer,
                "last_score": last_score,
                "pattern": pattern,
                "aspect_to_clarify": aspect_to_clarify
            }
            
            followup_questions = generate_followup(category, context_info)
            result["needs_followup"] = True
            result["followup_questions"] = followup_questions
        else:
            result["needs_followup"] = False
            
    result["category_scores"] = category_scores
     
    return jsonify(result)

@followup_bp.route('/submit_followup', methods=['POST'])
def submit_followup():
    """Process follow-up question responses."""
    data = request.json
    
    # Extract data
    category = data.get('category')
    followup_responses = data.get('followup_responses', [])
    print("followup response :",followup_responses)
    followup_scores = data.get('followup_scores', [])
    category_scores = data.get('category_scores', {})
    
    # Calculate average followup score
    avg_followup_score = calculate_average(followup_scores)
    
    # Update category scores
    if category not in category_scores:
        category_scores[category] = []
    category_scores[category].append(avg_followup_score)
    
    # Calculate followup confidence
    followup_confidence = min(0.2, len(followup_scores) * 0.05)
    
    return jsonify({
        "category_scores": category_scores,
        "followup_confidence": followup_confidence,
        "avg_followup_score": avg_followup_score
    })

@followup_bp.route('/calculate_profile', methods=['POST'])
def calculate_profile():
    """Calculate final risk profile based on all responses."""
    data = request.json
    
    # Extract data
    category_scores = data.get('category_scores', {})
    followup_confidence = data.get('followup_confidence', 0)
    user_responses = data.get('user_responses', {})
    
    # Calculate average scores for each category
    avg_category_scores = {cat: calculate_average(scores) for cat, scores in category_scores.items()}
    
    # Apply weightings
    weighted_scores = apply_weighting(avg_category_scores)
    
    # Calculate final score
    final_score = sum(weighted_scores.values()) * (0.8 + followup_confidence)
    
    # Determine risk profile
    profile_name, profile_desc = get_risk_profile(final_score)
    
    # Create profile data
    profile_data = {
        "category_scores": avg_category_scores,
        "weighted_scores": weighted_scores,
        "final_score": round(final_score, 2),
        "risk_profile": profile_name,
        "profile_description": profile_desc,
        "responses": user_responses,
        "followup_confidence": followup_confidence
    }
    
    # Save profile to storage
    user_id = str(int(time.time()))
    try:
        with open(f"storage/user_profiles/{user_id}.json", "w") as f:
            json.dump(profile_data, f, indent=2)
    except Exception as e:
        print(f"Error saving profile: {e}")
    
    return jsonify({
        "profile_id": user_id,
        "profile_data": profile_data
    })

@followup_bp.route('/profile/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    """Get a profile by ID."""
    try:
        # Validate profile_id format
        if not profile_id.isdigit():
            return jsonify({"error": "Invalid profile ID format"}), 400
        
        filepath = f"storage/user_profiles/{profile_id}.json"
        
        if not os.path.exists(filepath):
            return jsonify({"error": "Profile not found"}), 404
            
        with open(filepath, "r") as f:
            profile_data = json.load(f)
            
        return jsonify({
            "profile_id": profile_id,
            "profile_data": profile_data
        })
    except Exception as e:
        return jsonify({"error": f"Error retrieving profile: {str(e)}"}), 500