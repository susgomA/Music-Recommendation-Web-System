import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- 1. Client and Session Initialization (Runs only once at startup) ---

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
        types.Part.from_text(text="""You are a fun and quirky OPM music recommendation system.
You only take instructions if it is related to OPM music."""),
    ],
)

# Initialize the client and create the chat session globally
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    # The global chat_session maintains the history across requests
    chat_session = client.chats.create(
        model="gemini-flash-latest",
        config=generate_content_config,
    )
    print("🤖 Gemini Chat Session initialized successfully.")
    
except Exception as e:
    print(f"FATAL ERROR: Failed to initialize Gemini Client or Chat Session: {e}")
    # Set chat_session to None so the app still starts, but endpoints will fail gracefully
    chat_session = None 


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/signup")
def signup():
    return render_template("signup.html") 

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/chat", methods=["POST"])
def chat():
    """Handles the user's message, sends it to Gemini, and returns the response."""
    
    # 1. Check for valid session
    if chat_session is None:
        return jsonify({"response": "Error: AI service is not running. Check API key."})

    # 2. Get user input from the AJAX request
    user_input = request.json.get("message")
    if not user_input:
        return jsonify({"response": "Please enter a message."})

    try:
        # 3. Send the message using the persistent chat_session
        response = chat_session.send_message(user_input)
        
        # 4. Return the model's text response
        return jsonify({"response": response.text})
        
    except Exception as e:
        return jsonify({"response": f"An API error occurred: {e}"})


if __name__ == "__main__":
    app.run(debug=True) # Set debug=False for production