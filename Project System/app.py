import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from datetime import datetime
from flask_bcrypt import Bcrypt 
from sqlalchemy import func
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Database & Login Setup ---
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'your_super_secret_key_default') 
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_POOL_RECYCLE'] = 290
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db = SQLAlchemy(app)
bcrypt = Bcrypt(app) # Initialize Bcrypt
login_manager = LoginManager(app)
login_manager.login_view = 'login' 

# --- Database Models ---

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False) 
    age = db.Column(db.Integer, nullable=False)
    birthday = db.Column(db.Date, nullable=False)
    messages = db.relationship('Message', backref='author', lazy=True)
    
    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"
    

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # CRITICAL: Column to group messages into separate conversations
    session_id = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(10), nullable=False) # 'user' or 'model'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    """
    Handles unauthorized access, specifically for AJAX/API requests.
    If the request is JSON, return a custom JSON error instead of redirecting.
    """
    if request.is_json or request.path == '/chat':
        # Return the specific error message the frontend needs to display.
        return jsonify({
            'response': 'The user needs to login',
            'error': 'Unauthorized',
            'session_id': None
        }), 401 # HTTP 401 Unauthorized
    
    # Otherwise, perform the standard redirect for regular page access
    return redirect(url_for('login'))



# --- Sidebar/History Management Routes ---

@app.route("/get_chat_list", methods=["GET"])
@login_required
def get_chat_list():
    """Retrieves a list of distinct chat sessions for the current user's sidebar."""
    user_id = current_user.id
    
    # Efficiently find the first message (title) and the latest timestamp for each session
    latest_messages = db.session.query(
        Message.session_id,
        func.min(Message.timestamp).label('first_timestamp'), # Get the timestamp of the first message
        func.max(Message.timestamp).label('latest_timestamp') # Get the timestamp of the last message
    ).filter(
        Message.user_id == user_id
    ).group_by(Message.session_id).order_by(func.max(Message.timestamp).desc()).all()
    
    formatted_sessions = []
    
    for session_id, first_timestamp, latest_timestamp in latest_messages:
        # Fetch the content of the very first message for the title
        first_msg = Message.query.filter_by(user_id=user_id, session_id=session_id, timestamp=first_timestamp).first()
        
        title = first_msg.content if first_msg else "New Chat"
        
        formatted_sessions.append({
            'id': session_id,
            'title': title[:30] + '...' if len(title) > 30 else title,
            'timestamp': latest_timestamp.isoformat()
        })
        
    return jsonify({'sessions': formatted_sessions}), 200


@app.route("/new_chat", methods=["POST"])
@login_required
def new_chat():
    """Generates a new unique session ID for a new chat."""
    # Use current timestamp as a simple unique ID
    new_session_id = str(datetime.now().timestamp()).replace('.', '')
    
    return jsonify({'session_id': new_session_id}), 200


@app.route("/delete_chat/<session_id>", methods=["POST"])
@login_required
def delete_chat(session_id):
    """Deletes all messages associated with a specific session ID."""
    try:
        # Use synchronize_session=False for efficient bulk deletion
        Message.query.filter_by(user_id=current_user.id, session_id=session_id).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route("/load_session/<session_id>", methods=["GET"])
@login_required
def load_session(session_id):
    """Retrieves all messages for a specific session ID."""
    user_id = current_user.id
    
    db_history = Message.query.filter_by(user_id=user_id, session_id=session_id).order_by(Message.timestamp.asc()).all()
    
    formatted_history = []
    for msg in db_history:
        formatted_history.append({
            'sender': msg.role, 
            'content': msg.content 
        })
        
    return jsonify({'history': formatted_history}), 200


# --- Gemini Configuration (Defined once globally) ---
thinking_config = types.ThinkingConfig(thinking_budget=0)
generate_content_config = types.GenerateContentConfig(
    temperature=1.0,
    max_output_tokens=1500,
    thinking_config=thinking_config, 
    safety_settings=[
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_ONLY_HIGH"),
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_ONLY_HIGH"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_ONLY_HIGH"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_ONLY_HIGH"),
    ],
    system_instruction=[
        types.Part.from_text(text="""You are an Original Pinoy Music (OPM) music recommendation system.
You only take instructions if it is related to OPM music. You can take any music related questions, but answer it in the context of OPM. Please answer if the question is in tagalog.
IMPORTANT: Always format your response using HTML line breaks (<br>) between list items to ensure proper display on the web."""),
    ],
) 

# Initialize the Gemini client (ONLY the client, not the chat session)
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    print("🤖 Gemini Client initialized successfully.")
except Exception as e:
    print(f"FATAL ERROR: Failed to initialize Gemini Client: {e}")
    client = None 

# ----------------------------------------------------
#               FLASK ROUTES
# ----------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html", current_user=current_user)

@app.route("/signup")
def signup():
    return render_template("signup.html") 

# --- USER REGISTRATION ---
@app.route("/register", methods=["POST"])
def register():
    # ... (Your /register route logic remains the same) ...
    data = request.get_json()
    
    name = data.get('name')
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    age = data.get('age')
    birthday_str = data.get('birthday')

    if not all([username, email, password, name, age, birthday_str]):
        return jsonify({'error': 'Missing required fields.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username is already taken.'}), 409
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already in use.'}), 409

    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        birthday_date = datetime.strptime(birthday_str, '%Y-%m-%d').date() 
        age_int = int(age)

        user = User(
            name=name,
            username=username,
            email=email,
            password=hashed_password,
            age=age_int,
            birthday=birthday_date 
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully', 'redirect_url': url_for('login')}), 201

    except ValueError:
        return jsonify({'error': 'Invalid format for age or birthday.'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Database error during registration: {e}")
        return jsonify({'error': 'Internal server error during registration.'}), 500


# --- LOGIN ROUTE ---
@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'GET':
        return render_template('login.html', title='Login')
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password, password):
        login_user(user)
        return jsonify({
            'success': True, 
            'message': 'Login successful!',
            'redirect_url': url_for('index') 
        }), 200
    else:
        return jsonify({
            'success': False, 
            'error': 'Login failed. Check username and password.'
        }), 401

# --- LOGOUT ROUTE ---
@app.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('index')) 


# --- PERSISTENT CHAT ROUTE (The core logic) ---
@app.route("/chat", methods=["POST"])
@login_required 
def chat():
    # Check if client failed to initialize at startup
    if client is None:
        return jsonify({"response": "Error: AI service client not available."}), 503

    user_input = request.json.get("message")
    user_id = current_user.id 
    session_id = request.json.get("session_id")
    
    # CRITICAL: Get session_id from the frontend request
    session_id = request.json.get("session_id")
    if not session_id:
        # If no session ID is provided (e.g., first message ever), create one.
        session_id = str(datetime.now().timestamp()).replace('.', '')

    if not user_input:
        return jsonify({"response": "Please enter a message."}), 400

    # 1. Retrieve History for the SPECIFIC SESSION
    db_history = Message.query.filter_by(user_id=user_id, session_id=session_id).order_by(Message.timestamp.asc()).all()
    
    # 2. Convert DB messages into the Gemini API format
    history_for_gemini = [
        types.Content(
            role=msg.role,
            parts=[types.Part.from_text(text=msg.content)]
        )
        for msg in db_history
    ]

    # --- Database Operations (Within a try block for safety) ---
    try:
        # 3. Save User Message with the session_id
        user_message_db = Message(user_id=user_id, session_id=session_id, role='user', content=user_input)
        db.session.add(user_message_db)
        db.session.commit()

        # 4. Create a transient chat session with the full history
        chat_session = client.chats.create(
            model="gemini-flash-latest",
            config=generate_content_config,
            history=history_for_gemini 
        )
        
        # 5. Send the message and get response
        response = chat_session.send_message(user_input)
        response_text = response.text

        # 6. Save Model Response with the session_id
        model_message_db = Message(user_id=user_id, session_id=session_id, role='model', content=response_text)
        db.session.add(model_message_db)
        db.session.commit()
        
        # Return response AND the session_id so the frontend can update its state
        return jsonify({"response": response_text, "session_id": session_id}), 200

    except Exception as e:
        # 7. If any API or database error occurs, rollback the user message
        db.session.rollback()
        
        error_str = str(e)
        if "429 RESOURCE_EXHAUSTED" in error_str:
            error_message = "🤖 Error: Daily quota limit reached! Please upgrade your plan or wait until tomorrow."
            return jsonify({"response": error_message}), 429
        
        print(f"General API Error: {error_str}")
        return jsonify({"response": f"An API error occurred: {error_str}"}), 500

with app.app_context():
    db.create_all() 


if __name__ == "__main__":
    pass
    
