"""
Image Extraction Service
Extracts tournament results from Free Fire screenshots using Google Gemini Vision API
"""

import os
import io
import json
import base64
from PIL import Image
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema.messages import HumanMessage

# Gemini Vision Prompt
EXTRACTION_PROMPT = """
You are an AI assistant that extracts tournament results from Free Fire game screenshots.

Analyze this screenshot and extract the following information for each team/squad:
- Rank/Position (1-60)
- Player names (4 players per squad)
- Total eliminations for the squad

Return ONLY a valid JSON array with this exact structure:
[
  {
    "rank": 1,
    "players": ["player1", "player2", "player3", "player4"],
    "eliminations": 20
  }
]

Rules:
1. Extract ALL visible ranks (usually 1-20 shown in screenshot)
2. Each rank has exactly 4 players
3. Eliminations is the total for the squad
4. Return valid JSON only, no markdown, code blocks, or explanations
5. If a field is unclear, use best guess
6. Player names should match exactly as shown in the screenshot
7. Preserve special characters in player names (•, !, ?, etc.)

Screenshot:
"""

def prepare_image(image_file):
    """
    Prepare image for Gemini Vision API
    
    Args:
        image_file: Uploaded image file (FileStorage object)
    
    Returns:
        bytes: Image data as PNG bytes
    """
    try:
        # Open image
        img = Image.open(image_file)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (Gemini max: 4MB, recommended: 2048x2048)
        max_size = 2048
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG', optimize=True)
        img_byte_arr = img_byte_arr.getvalue()
        
        return img_byte_arr
        
    except Exception as e:
        raise ValueError(f"Failed to prepare image: {e}")

def parse_gemini_response(response_text):
    """
    Parse Gemini's response and extract JSON
    
    Args:
        response_text: Raw response from Gemini
    
    Returns:
        list: Validated results array
    """
    try:
        # Remove markdown code blocks
        content = response_text.strip()
        
        # Remove ```json and ``` markers
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        # Parse JSON
        results = json.loads(content)
        
        # Validate structure
        if not isinstance(results, list):
            raise ValueError("Response is not a list")
        
        # Validate each result
        validated_results = []
        for result in results:
            if validate_result(result):
                validated_results.append(result)
            else:
                print(f"Warning: Invalid result skipped: {result}")
        
        if len(validated_results) == 0:
            raise ValueError("No valid results found in response")
        
        return validated_results
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON response: {e}")
    except Exception as e:
        raise ValueError(f"Failed to parse response: {e}")

def validate_result(result):
    """
    Validate a single result object
    
    Args:
        result: Dict with rank, players, eliminations
    
    Returns:
        bool: True if valid
    """
    required_fields = ['rank', 'players', 'eliminations']
    
    # Check all fields present
    if not all(field in result for field in required_fields):
        return False
    
    # Validate types
    if not isinstance(result['rank'], int):
        return False
    if not isinstance(result['players'], list):
        return False
    if not isinstance(result['eliminations'], int):
        return False
    
    # Validate ranges
    if result['rank'] < 1 or result['rank'] > 60:
        return False
    if len(result['players']) != 4:
        return False
    if result['eliminations'] < 0 or result['eliminations'] > 100:
        return False
    
    return True

def extract_results_from_image(image_file):
    """
    Extract tournament results from screenshot using Gemini Vision
    
    Args:
        image_file: Uploaded image file (FileStorage object)
    
    Returns:
        list: Array of dicts with rank, players, eliminations
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    try:
        # Prepare image
        print("📸 Preparing image...")
        image_data = prepare_image(image_file)
        image_b64 = base64.b64encode(image_data).decode()
        
        # Initialize Gemini Vision model
        print("🤖 Initializing Gemini Vision...")
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0  # Deterministic output for structured data
        )
        
        # Create message with image
        message = HumanMessage(
            content=[
                {"type": "text", "text": EXTRACTION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": f"data:image/png;base64,{image_b64}"
                }
            ]
        )
        
        # Get response
        print("🔍 Extracting data from screenshot...")
        response = llm.invoke([message])
        
        # Parse response
        print("✅ Parsing results...")
        results = parse_gemini_response(response.content)
        
        print(f"✅ Extracted {len(results)} teams successfully")
        return results
        
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        raise


# Gemini Vision Prompt
EXTRACTION_PROMPT = """
You are an AI assistant that extracts tournament results from Free Fire game screenshots.

Analyze this screenshot and extract the following information for each team/squad:
- Rank/Position (1-60)
- Player names (4 players per squad)
- Total eliminations for the squad

Return ONLY a valid JSON array with this exact structure:
[
  {
    "rank": 1,
    "players": ["player1", "player2", "player3", "player4"],
    "eliminations": 20
  }
]

Rules:
1. Extract ALL visible ranks (usually 1-20 shown in screenshot)
2. Each rank has exactly 4 players
3. Eliminations is the total for the squad
4. Return valid JSON only, no markdown, code blocks, or explanations
5. If a field is unclear, use best guess
6. Player names should match exactly as shown in the screenshot
7. Preserve special characters in player names (•, !, ?, etc.)

Screenshot:
"""

def prepare_image(image_file):
    """
    Prepare image for Gemini Vision API
    
    Args:
        image_file: Uploaded image file (FileStorage object)
    
    Returns:
        bytes: Image data as PNG bytes
    """
    try:
        # Open image
        img = Image.open(image_file)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (Gemini max: 4MB, recommended: 2048x2048)
        max_size = 2048
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG', optimize=True)
        img_byte_arr = img_byte_arr.getvalue()
        
        return img_byte_arr
        
    except Exception as e:
        raise ValueError(f"Failed to prepare image: {e}")

def parse_gemini_response(response_text):
    """
    Parse Gemini's response and extract JSON
    
    Args:
        response_text: Raw response from Gemini
    
    Returns:
        list: Validated results array
    """
    try:
        # Remove markdown code blocks
        content = response_text.strip()
        
        # Remove ```json and ``` markers
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        # Parse JSON
        results = json.loads(content)
        
        # Validate structure
        if not isinstance(results, list):
            raise ValueError("Response is not a list")
        
        # Validate each result
        validated_results = []
        for result in results:
            if validate_result(result):
                validated_results.append(result)
            else:
                print(f"Warning: Invalid result skipped: {result}")
        
        if len(validated_results) == 0:
            raise ValueError("No valid results found in response")
        
        return validated_results
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON response: {e}")
    except Exception as e:
        raise ValueError(f"Failed to parse response: {e}")

def validate_result(result):
    """
    Validate a single result object
    
    Args:
        result: Dict with rank, players, eliminations
    
    Returns:
        bool: True if valid
    """
    required_fields = ['rank', 'players', 'eliminations']
    
    # Check all fields present
    if not all(field in result for field in required_fields):
        return False
    
    # Validate types
    if not isinstance(result['rank'], int):
        return False
    if not isinstance(result['players'], list):
        return False
    if not isinstance(result['eliminations'], int):
        return False
    
    # Validate ranges
    if result['rank'] < 1 or result['rank'] > 60:
        return False
    if len(result['players']) != 4:
        return False
    if result['eliminations'] < 0 or result['eliminations'] > 100:
        return False
    
    return True

def extract_results_from_image(image_file):
    """
    Extract tournament results from screenshot using Gemini Vision
    
    Args:
        image_file: Uploaded image file (FileStorage object)
    
    Returns:
        list: Array of dicts with rank, players, eliminations
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    try:
        # Prepare image
        print("📸 Preparing image...")
        image_data = prepare_image(image_file)
        image_b64 = base64.b64encode(image_data).decode()
        
        # Initialize Gemini Vision model
        print("🤖 Initializing Gemini Vision...")
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0  # Deterministic output for structured data
        )
        
        # Create message with image
        message = HumanMessage(
            content=[
                {"type": "text", "text": EXTRACTION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": f"data:image/png;base64,{image_b64}"
                }
            ]
        )
        
        # Get response
        print("🔍 Extracting data from screenshot...")
        response = llm.invoke([message])
        
        # Parse response
        print("✅ Parsing results...")
        results = parse_gemini_response(response.content)
        
        print(f"✅ Extracted {len(results)} teams successfully")
        return results
        
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        raise

def store_results_in_supabase(image_file, results, original_filename):
    """
    Store extracted results and screenshot in Supabase
    
    Args:
        image_file: Original image file
        results: Extracted results array
        original_filename: Original filename
    
    Returns:
        dict: Storage URLs and metadata
    """
    try:
        supabase = get_supabase_client()
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = original_filename.rsplit('.', 1)[0]
        
        # Store screenshot image
        image_filename = f"{timestamp}_{base_name}.png"
        image_file.seek(0)  # Reset file pointer
        image_data = image_file.read()
        
        print(f"📤 Uploading screenshot to Supabase...")
        image_response = supabase.storage.from_("Results").upload(
            path=f"screenshots/{image_filename}",
            file=image_data,
            file_options={"content-type": "image/png"}
        )
        
        # Store results JSON
        json_filename = f"{timestamp}_{base_name}_results.json"
        json_data = json.dumps(results, indent=2).encode('utf-8')
        
        print(f"📤 Uploading results JSON to Supabase...")
        json_response = supabase.storage.from_("Results").upload(
            path=f"results/{json_filename}",
            file=json_data,
            file_options={"content-type": "application/json"}
        )
        
        # Get public URLs
        image_url = supabase.storage.from_("Results").get_public_url(f"screenshots/{image_filename}")
        json_url = supabase.storage.from_("Results").get_public_url(f"results/{json_filename}")
        
        print(f"✅ Stored in Supabase successfully")
        
        return {
            "screenshot_url": image_url,
            "results_url": json_url,
            "screenshot_path": f"screenshots/{image_filename}",
            "results_path": f"results/{json_filename}"
        }
        
    except Exception as e:
        print(f"❌ Supabase storage failed: {e}")
        raise ValueError(f"Failed to store in Supabase: {e}")
