# backend/models.py
from flask_sqlalchemy import SQLAlchemy # type: ignore
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    user_profile = db.Column(db.JSON, nullable=True)
    portfolio = db.Column(db.JSON, nullable=True)

    def __repr__(self):
        return f'<User {self.email}>'
    
class FolioQuestion(db.Model):
    __tablename__ = 'folio_questions'
    id = db.Column(db.Integer, primary_key=True)
    # The question text to be displayed
    question_text = db.Column(db.String, nullable=False)
    # Options stored as a JSON array (e.g., ["Option A", "Option B", "Option C", "Option D"])
    options = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

class UserLog(db.Model):
    __tablename__ = 'user_logs'
    log_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    activity = db.Column(db.String(50), nullable=False)
    stock_ticker = db.Column(db.String(20), nullable=True)
    volume = db.Column(db.Float, nullable=True)
    activity_time = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    def __repr__(self):
        return f"<UserLog {self.log_id} - {self.email} - {self.activity}>"
    
class OnboardingQuestions(db.Model):
    __tablename__ = 'onboarding_questions'
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    options = db.Column(db.JSON, nullable=True)

    # "id": "CQ1",
    #   "question": "How long do you typically hold stocks?",
    #   "category": "type_of_trader",
    #   "options": [
    #     {"option": "Seconds/minutes (Scalper)", "score": 10},
    #     {"option": "Intraday (Day Trader)", "score": 8},
    #     {"option": "Days to weeks (Swing)", "score": 6},
    #     {"option": "Months (Position)", "score": 4},
    #     {"option": "Years (Investor)", "score": 2}
    #   ]