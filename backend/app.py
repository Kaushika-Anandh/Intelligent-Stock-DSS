from flask import Flask
from flask_cors import CORS # type: ignore
from config import Config
from models import db 
from routes import auth_bp, table_bp, questions_bp, portfolio_bp, userlogs_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

db.init_app(app)
with app.app_context():
    db.create_all()

API_PREFIX="/api/v1"

app.register_blueprint(auth_bp, url_prefix=API_PREFIX)
app.register_blueprint(table_bp)
app.register_blueprint(questions_bp, url_prefix=API_PREFIX)
app.register_blueprint(portfolio_bp, url_prefix=API_PREFIX)
app.register_blueprint(userlogs_bp, url_prefix=API_PREFIX)


if __name__ == '__main__':
    app.run(debug=True)
