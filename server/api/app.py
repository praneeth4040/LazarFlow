from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Use relative imports for Gunicorn compatibility
try:
    from .ai_service import extract_teams_from_text
    from .image_extraction_service import extract_results_from_image
except ImportError:
    # Fallback for direct execution
    from ai_service import extract_teams_from_text
    from image_extraction_service import extract_results_from_image

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS Configuration
# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600
    }
})

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
    """Health check endpoint for monitoring"""
    return jsonify({
        "status": "healthy",
        "environment": os.getenv('ENVIRONMENT', 'development'),
        "version": "1.0.0"
    })

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
        # Check if image files are present
        if 'images' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image files provided"
            }), 400
        
        image_files = request.files.getlist('images')
        
        if not image_files or image_files[0].filename == '':
            return jsonify({
                "success": False,
                "error": "No selected files"
            }), 400
            
        logger.info(f"📥 Received {len(image_files)} images")
        
        all_results_map = {}
        
        for image_file in image_files:
            # Validate file type
            if not allowed_file(image_file.filename):
                logger.warning(f"⚠️ Skipping invalid file: {image_file.filename}")
                continue
            
            # Check file size
            image_file.seek(0, os.SEEK_END)
            file_size = image_file.tell()
            image_file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                logger.warning(f"⚠️ Skipping large file: {image_file.filename}")
                continue
            
            logger.info(f"Processing {image_file.filename} ({file_size / 1024:.2f} KB)...")
            
            try:
                # Extract results from image
                results = extract_results_from_image(image_file)
                
                # Merge results (deduplicate by rank)
                for result in results:
                    rank = result['rank']
                    # Strategy: Overwrite if exists (assuming later images might correct earlier ones, 
                    # or just simple merge. Since we can't know which is 'better', last one wins is simple)
                    # Alternatively, we could check which has more players?
                    if rank in all_results_map:
                        existing = all_results_map[rank]
                        # If new result has more players, use it
                        if len(result['players']) > len(existing['players']):
                            all_results_map[rank] = result
                    else:
                        all_results_map[rank] = result
                        
            except Exception as e:
                logger.error(f"❌ Error processing {image_file.filename}: {e}")
                # Continue with other images even if one fails
        
        # Convert map to list and sort by rank
        final_results = sorted(list(all_results_map.values()), key=lambda x: x['rank'])
        
        if not final_results:
             return jsonify({
                "success": False,
                "error": "Failed to extract any valid results from images"
            }), 400
        
        # Store in Supabase (store the first image as reference for now, or all?)
        # For simplicity, we'll skip storing multiple images in this demo flow or just store the first one
        storage_info = None
        if image_files:
            try:
                first_image = image_files[0]
                first_image.seek(0)
                # storage_info = store_results_in_supabase(...) # Uncomment if storage is needed
            except Exception as e:
                logger.warning(f"⚠️ Storage warning: {e}")
        
        return jsonify({
            "success": True,
            "results": final_results,
            "storage": storage_info,
            "count": len(final_results)
        })
        
    except ValueError as e:
        # Client errors (bad input, validation failures)
        logger.error(f"❌ Validation error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    except Exception as e:
        # Server errors (API failures, etc.)
        logger.error(f"❌ Server error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Internal server error. Please try again."
        }), 500

if __name__ == '__main__':
    # Check required environment variables
    required_vars = ['GOOGLE_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        logger.error("Please set them in .env file")
        exit(1)
    
    logger.info("✅ All environment variables set")
    logger.info("🚀 Starting LazarFlow Server...")
    app.run(host="0.0.0.0", port=5000)



