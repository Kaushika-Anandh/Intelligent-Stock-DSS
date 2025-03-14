import firebase_admin # type: ignore
from firebase_admin import credentials, auth as firebase_auth # type: ignore
import jwt # type: ignore
from datetime import datetime, timedelta, timezone
from flask import current_app
import json

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_config.json")
firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token):
    """
    Verify the Firebase ID token using firebase-admin.
    """
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token  # contains uid and other user details
    except Exception as e:
        print("Firebase token verification failed:", e)
        return None

def create_jwt(user_payload):
    """
    Create a JWT token from the user payload.
    """
    expiration = datetime.now(timezone.utc) + current_app.config['JWT_EXPIRATION_DELTA']
    token = jwt.encode({
        'user': user_payload,
        'exp': expiration
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    return token

def decode_jwt(token):
    """
    Decode and verify the JWT token.
    """
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
