from flask import Blueprint, request, jsonify # type: ignore
from auth import verify_firebase_token, create_jwt, decode_jwt
from models import db, User, FolioQuestion, UserLog
from sqlalchemy import MetaData, inspect # type: ignore
import os
import requests
from llm_pipeline import get_desc_insights, chat_groq
auth_bp = Blueprint('auth_bp', __name__)
table_bp = Blueprint('table_bp', __name__)
questions_bp = Blueprint('questions_bp', __name__)
portfolio_bp = Blueprint("portfolio_bp", __name__)
userlogs_bp = Blueprint("userlogs_bp", __name__)
suggestions_bp = Blueprint("suggestions_bp", __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Expects a JSON payload with the Firebase ID token.
    """
    data = request.get_json()
    id_token = data.get('id_token')

    if not id_token:
        return jsonify({'error': 'Missing Firebase ID token'}), 400

    # Verify Firebase token
    firebase_user = verify_firebase_token(id_token)
    if not firebase_user:
        return jsonify({'error': 'Invalid Firebase token'}), 401

    user_email = firebase_user.get('email')
    if not user_email:
        return jsonify({'error': 'Email not provided by Firebase'}), 400

    user = User.query.filter_by(email=user_email).first()
    if not user:
        # Create a new user record
        user = User(email=user_email)
        db.session.add(user)
        db.session.commit()
        is_new = True
    else:
        is_new = False

    # Create our own JWT (you might include more user details as needed)
    jwt_payload = {
        'uid': firebase_user['uid'],
        'email': user_email,
        'is_new': is_new
    }
    jwt_token = create_jwt(jwt_payload)

    # Return the token (and optionally the is_new flag)
    return jsonify({'token': jwt_token, 'is_new': is_new})

@auth_bp.route('/refresh_token', methods=['GET'])
def refresh_token():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Find the user
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Create a new JWT that reflects the updated onboarding status.
    # For example, once onboarding is complete, you might want to mark the user as not new.
    jwt_payload = {
        'uid': user.id,  # or firebase uid if available
        'email': user.email,
        # For instance, if onboarding is complete, set is_new to false.
        'is_new': False  
    }
    new_token = create_jwt(jwt_payload)
    return jsonify({'token': new_token}), 200

def token_required(f):
    """
    A decorator to protect routes that require a valid JWT.
    """
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers.get('Authorization').split(" ")[1]
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        user_payload = decode_jwt(token)
        if not user_payload:
            return jsonify({'message': 'Token is invalid or expired!'}), 401

        # Pass user information to the route if needed
        return f(user_payload, *args, **kwargs)
    return decorated

@auth_bp.route('/protected', methods=['GET'])
@token_required
def protected_route(user_payload):
    return jsonify({'message': f'Welcome, user {user_payload["user"]["uid"]}!'})

@questions_bp.route('/folio_questions', methods=['GET'])
def get_folio_questions():
    questions = FolioQuestion.query.all()
    data = []
    for q in questions:
        data.append({
            'id': q.id,
            'question_text': q.question_text,
            'options': q.options
        })
    return jsonify(data), 200

@questions_bp.route('/user/onboarding', methods=['POST'])
def submit_onboarding():
    data = request.get_json()
    email = data.get('email')
    answers = data.get('answers')  # Expected format: a JSON object, e.g., {"1": "Option A", "2": "Option B", ...}

    if not email or not answers:
        return jsonify({"error": "Email and answers are required."}), 400

    # Find the user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "user not found."}), 404

    # Update the user's onboarding answers column with the submitted answers
    user.onboarding_answers = answers
    db.session.commit()

    return jsonify({"message": "Onboarding answers saved successfully."}), 200

@questions_bp.route('/folio_questions/add', methods=['POST'])
def add_folio_question():
    """
    Add a new MCQ question to the folio_questions table.
    Expects JSON payload:
    {
      "question_text": "Your question here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
    """
    data = request.get_json()
    question_text = data.get('question_text')
    options = data.get('options')  # Expected to be a list

    if not question_text or not options:
        return jsonify({"error": "Both 'question_text' and 'options' are required."}), 400

    if not isinstance(options, list):
        return jsonify({"error": "'options' must be an array of strings."}), 400

    try:
        # Create a new FolioQuestion record
        new_question = FolioQuestion(question_text=question_text, options=options)
        db.session.add(new_question)
        db.session.commit()

        return jsonify({
            "message": "Question added successfully.",
            "question_id": new_question.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error adding question: {str(e)}"}), 500



@table_bp.route('/table/<string:table_name>', methods=['GET'])
def get_table(table_name):
    """
    Retrieve and return all data from a given table.
    The table name is provided in the URL.
    """
    # Create MetaData instance without binding
    metadata = MetaData()
    try:
        # Reflect only the specified table using the engine
        metadata.reflect(bind=db.engine, only=[table_name])
    except Exception as e:
        return jsonify({"error": f"Error reflecting table: {str(e)}"}), 500

    table = metadata.tables.get(table_name)
    if table is None:
        return jsonify({"error": "table not found"}), 404

    # Query the table
    connection = db.engine.connect()
    try:
        results = connection.execute(table.select()).fetchall()
    except Exception as e:
        return jsonify({"error": f"Error querying table: {str(e)}"}), 500
    finally:
        connection.close()

    # Convert result rows to dictionaries (for SQLAlchemy 1.4+)
    data = [dict(row._mapping) for row in results]

    return jsonify(data)

@table_bp.route('/tables', methods=['GET'])
def list_tables():
    """
    Retrieve and return the names of all tables in the database.
    """
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()
    return jsonify({"tables": table_names})

@table_bp.route('/table/<string:table_name>/user/<int:user_id>', methods=['DELETE'])
def delete_user(table_name, user_id):
    """
    Delete a single user from the specified table based on user_id.
    """
    # Reflect the specified table
    metadata = MetaData()
    try:
        metadata.reflect(bind=db.engine, only=[table_name])
    except Exception as e:
        return jsonify({"error": f"Error reflecting table: {str(e)}"}), 500

    table = metadata.tables.get(table_name)
    if table is None:
        return jsonify({"error": "Table not found"}), 404

    # Delete the row where the column 'id' equals user_id
    try:
        stmt = table.delete().where(table.c.id == user_id)
        # Use a transaction for the delete operation
        with db.engine.begin() as connection:
            result = connection.execute(stmt)
        return jsonify({
            "message": f"User with id {user_id} deleted successfully.",
            "deleted_rows": result.rowcount
        })
    except Exception as e:
        return jsonify({"error": f"Error deleting user: {str(e)}"}), 500


@table_bp.route('/table/<string:table_name>/users', methods=['DELETE'])
def delete_all_users(table_name):
    """
    Delete all rows (users) from the specified table.
    """
    # Reflect the specified table
    metadata = MetaData()
    try:
        metadata.reflect(bind=db.engine, only=[table_name])
    except Exception as e:
        return jsonify({"error": f"Error reflecting table: {str(e)}"}), 500

    table = metadata.tables.get(table_name)
    if table is None:
        return jsonify({"error": "Table not found"}), 404

    # Delete all rows from the table
    try:
        stmt = table.delete()
        with db.engine.begin() as connection:
            result = connection.execute(stmt)
        return jsonify({
            "message": "All users deleted successfully.",
            "deleted_rows": result.rowcount
        })
    except Exception as e:
        return jsonify({"error": f"Error deleting users: {str(e)}"}), 500
    

@portfolio_bp.route('/user/portfolio', methods=['GET'])
def get_portfolio():
    """
    Retrieve the current portfolio for the user based on email.
    Expects a query parameter: ?email=...
    """
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "email is required."}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "user not found."}), 404

    # Return the portfolio; if empty, return an empty object.
    return jsonify({"portfolio": user.portfolio or {}}), 200

@portfolio_bp.route('/user/portfolio', methods=['POST', 'PUT'])
def update_portfolio():
    """
    Update (create/modify) the user's portfolio.
    Expects JSON payload:
    {
      "email": "user@example.com",
      "portfolio": { "stock1": volume, "stock2": volume, ... }
    }
    """
    data = request.get_json()
    email = data.get('email')
    portfolio = data.get('portfolio')

    if not email or portfolio is None:
        return jsonify({"error": "Email and portfolio data are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.portfolio = portfolio
    db.session.commit()

    return jsonify({"message": "Portfolio updated successfully."}), 200

@portfolio_bp.route('/user/portfolio', methods=['DELETE'])
def delete_portfolio():
    """
    Clear the portfolio for the user.
    Expects JSON payload: { "email": "user@example.com" }
    """
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    user.portfolio = {}
    db.session.commit()

    return jsonify({"message": "Portfolio cleared."}), 200

@userlogs_bp.route('/user/logs', methods=['POST'])
def add_user_log():
    """
    Add a new user log.
    Expected JSON payload:
    {
      "email": "user@example.com",
      "activity": "buy",          // e.g., "buy", "sell", "hold"
      "stock_ticker": "AAPL",       // optional
      "volume": 10                // optional
    }
    """
    data = request.get_json()
    email = data.get('email')
    activity = data.get('activity')
    stock_ticker = data.get('stock_ticker')
    volume = data.get('volume')

    if not email or not activity:
        return jsonify({"error": "Email and activity are required."}), 400

    try:
        new_log = UserLog(
            email=email,
            activity=activity,
            stock_ticker=stock_ticker,
            volume=volume
        )
        db.session.add(new_log)
        db.session.commit()
        return jsonify({"message": "User log added successfully.", "log_id": new_log.log_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error adding user log: {str(e)}"}), 500

@userlogs_bp.route('/user/logs', methods=['GET'])
def get_user_logs():
    """
    Retrieve all logs for a given user email.
    Expects a query parameter: ?email=user@example.com
    """
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is required."}), 400

    try:
        # Query the user_logs table filtering by email and order by activity_time (descending)
        logs = UserLog.query.filter_by(email=email).order_by(UserLog.activity_time.desc()).all()
        # Convert each log to a dictionary for JSON response
        result = [{
            "log_id": log.log_id,
            "email": log.email,
            "activity": log.activity,
            "stock_ticker": log.stock_ticker,
            "volume": log.volume,
            "activity_time": log.activity_time.isoformat()  # Convert datetime to ISO format string
        } for log in logs]
        return jsonify({"logs": result}), 200

    except Exception as e:
        return jsonify({"error": f"Error retrieving logs: {str(e)}"}), 500

@userlogs_bp.route('/news/sentiment-analysis/<ticker>', methods=['GET'])
def get_ticker_news_sentiment(ticker):
    try:
        output = get_desc_insights(ticker=ticker)
        if output:
            descriptions, news_insights, news_links = output
            llm_response = chat_groq(description=descriptions, insights=news_insights) 
            return jsonify({"llm_response":llm_response, "news_links":news_links}), 200
        
        return jsonify({"error": "Error retrieving stock news:"}), 500
    except Exception as e:
        return jsonify({"error": f"Error retrieving stock news: {str(e)}"}), 500
