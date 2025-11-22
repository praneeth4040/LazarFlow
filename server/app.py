from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from ai_service import extract_teams_from_text
from image_extraction_service import extract_results_from_image

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# File upload configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def hello_world():
    return jsonify({"message": "Hello from LazarFlow Server!"})

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/extract-teams', methods=['POST'])
def extract_teams():
    """Extract team names from text (existing endpoint)"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
            
        text = data['text']
        teams = extract_teams_from_text(text)
        
        return jsonify({"teams": teams})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/extract-results', methods=['POST'])
def extract_results():
    """
    Extract tournament results from Free Fire screenshot
    
    Expects: multipart/form-data with 'image' file
    Returns: JSON with extracted results (frontend handles storage)
    """
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        image_file = request.files['image']
        
        # Check if file is empty
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "Empty filename"
            }), 400
        
        # Validate file type
        if not allowed_file(image_file.filename):
            return jsonify({
                "success": False,
                "error": f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"
            }), 400
        
        # Check file size
        image_file.seek(0, os.SEEK_END)
        file_size = image_file.tell()
        image_file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            }), 400
        
        print(f"📥 Received image: {image_file.filename} ({file_size / 1024:.2f} KB)")
        
        # Extract results from image
        results = extract_results_from_image(image_file)
        
        # Return results (frontend will handle storage)
        return jsonify({
            "success": True,
            "results": results
        })
        
    except ValueError as e:
        # Client errors (bad input, validation failures)
        print(f"❌ Validation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    except Exception as e:
        # Server errors (API failures, etc.)
        print(f"❌ Server error: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error. Please try again."
        }), 500

if __name__ == '__main__':
    # Check required environment variables
    required_vars = ['GOOGLE_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set them in .env file")
        exit(1)
    
    print("✅ All environment variables set")
    print("🚀 Starting LazarFlow Server...")
    app.run(debug=True, port=5000)


# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# File upload configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def hello_world():
    return jsonify({"message": "Hello from LazarFlow Server!"})

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/extract-teams', methods=['POST'])
def extract_teams():
    """Extract team names from text (existing endpoint)"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
            
        text = data['text']
        teams = extract_teams_from_text(text)
        
        return jsonify({"teams": teams})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/extract-results', methods=['POST'])
def extract_results():
    """
    Extract tournament results from Free Fire screenshot
    
    Expects: multipart/form-data with 'image' file
    Returns: JSON with extracted results and storage URLs
    """
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        image_file = request.files['image']
        
        # Check if file is empty
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "Empty filename"
            }), 400
        
        # Validate file type
        if not allowed_file(image_file.filename):
            return jsonify({
                "success": False,
                "error": f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"
            }), 400
        
        # Check file size (optional, Flask has its own limit)
        image_file.seek(0, os.SEEK_END)
        file_size = image_file.tell()
        image_file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            }), 400
        
        print(f"📥 Received image: {image_file.filename} ({file_size / 1024:.2f} KB)")
        
        # Extract results from image
        results = extract_results_from_image(image_file)
        
        # Store in Supabase
        image_file.seek(0)  # Reset file pointer
        storage_info = store_results_in_supabase(
            image_file, 
            results, 
            image_file.filename
        )
        
        return jsonify({
            "success": True,
            "results": results,
            "storage": storage_info,
            "count": len(results)
        })
        
    except ValueError as e:
        # Client errors (bad input, validation failures)
        print(f"❌ Validation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    except Exception as e:
        # Server errors (API failures, etc.)
        print(f"❌ Server error: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error. Please try again."
        }), 500

if __name__ == '__main__':
    # Check required environment variables
    required_vars = ['GOOGLE_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set them in .env file")
        exit(1)
    
    print("✅ All environment variables set")
    print("🚀 Starting LazarFlow Server...")
    app.run(debug=True, port=5000)

