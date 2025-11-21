from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from ai_service import extract_teams_from_text

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route('/')
def hello_world():
    return jsonify({"message": "Hello from LazarFlow Server!"})

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/extract-teams', methods=['POST'])
def extract_teams():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
            
        text = data['text']
        teams = extract_teams_from_text(text)
        
        return jsonify({"teams": teams})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
