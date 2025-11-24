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
    Extract tournament results from screenshot using Gemini with LangChain
    
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
        
        # Initialize Gemini model
        print("🤖 Initializing Gemini 2.5 Flash...")
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",  # Gemini 2.5 Flash (latest, supports vision)
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
