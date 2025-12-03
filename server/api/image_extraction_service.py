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

# Import prompts
try:
    from .prompts import EXTRACT_PLAYER_DETAILS_PROMPT, EXTRACTION_PROMPT
except ImportError:
    from prompts import EXTRACT_PLAYER_DETAILS_PROMPT, EXTRACTION_PROMPT

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

def parse_gemini_response(response_text, detailed=False):
    """
    Parse Gemini's response and extract JSON
    
    Args:
        response_text: Raw response from Gemini
        detailed: If True, expect detailed player stats format
    
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
            if detailed:
                if validate_detailed_result(result):
                    validated_results.append(result)
                else:
                    print(f"Warning: Invalid detailed result skipped: {result}")
            else:
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
    Validate a single result object (basic format)
    """
    required_fields = ['rank', 'players', 'eliminations']
    
    # Check all fields present
    if not all(field in result for field in required_fields):
        return False
    
    # Auto-convert strings to ints if possible
    try:
        if isinstance(result['rank'], str):
            result['rank'] = int(result['rank'])
        if isinstance(result['eliminations'], str):
            result['eliminations'] = int(result['eliminations'])
    except ValueError:
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
    if len(result['players']) < 1 or len(result['players']) > 5:
        return False
    if result['eliminations'] < 0 or result['eliminations'] > 100:
        return False
    
    return True

def validate_detailed_result(result):
    """
    Validate a detailed result object (with player stats)
    """
    required_fields = ['team_name', 'rank', 'players', 'total_eliminations']
    
    # Check all fields present
    if not all(field in result for field in required_fields):
        return False
    
    # Auto-convert strings to ints
    try:
        if isinstance(result['rank'], str):
            result['rank'] = int(result['rank'])
        if isinstance(result['total_eliminations'], str):
            result['total_eliminations'] = int(result['total_eliminations'])
    except ValueError:
        return False
    
    # Validate types
    if not isinstance(result['team_name'], str):
        return False
    if not isinstance(result['rank'], int):
        return False
    if not isinstance(result['players'], list):
        return False
    if not isinstance(result['total_eliminations'], int):
        return False
    
    # Validate ranges
    if result['rank'] < 1 or result['rank'] > 60:
        return False
    if len(result['players']) < 1 or len(result['players']) > 5:
        return False
    
    # Validate each player
    for player in result['players']:
        if not isinstance(player, dict):
            return False
        if 'name' not in player or 'kills' not in player:
            return False
            
        # Convert player stats strings to ints
        try:
            if isinstance(player['kills'], str):
                player['kills'] = int(player['kills'])
            if 'wwcd' in player and isinstance(player['wwcd'], str):
                player['wwcd'] = int(player['wwcd'])
            if 'matches_played' in player and isinstance(player['matches_played'], str):
                player['matches_played'] = int(player['matches_played'])
        except ValueError:
            return False
            
        if not isinstance(player['name'], str):
            return False
        if not isinstance(player['kills'], int):
            return False
    
    return True

def extract_results_from_image(image_files, detailed=False):
    """
    Extract tournament results from multiple screenshots using Gemini with LangChain
    
    Args:
        image_files: List of Uploaded image files (FileStorage objects)
        detailed: If True, extract detailed player stats. If False, basic team results.
    
    Returns:
        list: Array of dicts with team results
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    try:
        # Prepare images
        print(f"📸 Preparing {len(image_files)} images...")
        content_parts = []
        
        # Add prompt first
        prompt = EXTRACT_PLAYER_DETAILS_PROMPT if detailed else EXTRACTION_PROMPT
        
        # Add instruction for multiple images
        if len(image_files) > 1:
            prompt += "\n\nNOTE: You are provided with MULTIPLE overlapping screenshots of the same results table. \n" \
                      "Please merge the information from all screenshots into a SINGLE consolidated list of unique teams. \n" \
                      "Avoid duplicates! If a team appears in multiple screenshots, use the one with the most complete information. \n" \
                      "The screenshots are sequential parts of a scrollable list."
        
        content_parts.append({"type": "text", "text": prompt})
        
        for img_file in image_files:
            image_data = prepare_image(img_file)
            image_b64 = base64.b64encode(image_data).decode()
            content_parts.append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{image_b64}"
            })
        
        # Initialize Gemini model
        print("🤖 Initializing Gemini 2.5 Flash...")
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",  # Gemini 2.5 Flash (latest, supports vision)
            google_api_key=api_key,
            temperature=0,  # Deterministic output for structured data
            model_kwargs={"response_mime_type": "application/json"}
        )
        
        # Create message with all images
        message = HumanMessage(content=content_parts)
        
        # Get response
        extraction_type = "detailed player stats" if detailed else "team results"
        print(f"🔍 Extracting {extraction_type} from {len(image_files)} screenshots...")
        response = llm.invoke([message])
        
        # Parse response
        print("✅ Parsing results...")
        results = parse_gemini_response(response.content, detailed=detailed)
        
        print(f"✅ Extracted {len(results)} teams successfully")
        return results
        
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        raise
