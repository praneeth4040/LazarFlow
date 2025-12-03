import os
import json
import re
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate

# Import prompts
try:
    from .prompts import EXTRACT_TEAMS_PROMPT
except ImportError:
    from prompts import EXTRACT_TEAMS_PROMPT

# Configure logging
logger = logging.getLogger(__name__)


def extract_teams_from_text(text):
    """
    Extracts a list of team names from unstructured text using Google Gemini.
    
    Args:
        text (str): Unstructured text containing team names
        
    Returns:
        list: List of team name strings
        
    Raises:
        ValueError: If input is invalid or API key is missing
    """
    logger.info("🔍 Starting team extraction from text")
    
    # Input validation
    if not text or not isinstance(text, str):
        logger.error("❌ Invalid input: text is empty or not a string")
        raise ValueError("Text input is required and must be a string")
    
    if len(text.strip()) == 0:
        logger.warning("⚠️ Empty text provided after stripping whitespace")
        return []
    
    logger.info(f"📝 Input text length: {len(text)} characters")

    # Check API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("❌ GOOGLE_API_KEY environment variable not set")
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    try:
        # Initialize Gemini model
        logger.info("🤖 Initializing Gemini model (gemini-2.5-pro)")
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            google_api_key=api_key,
            model_kwargs={"response_mime_type": "application/json"}
        )

        # Use centralized prompt
        template = EXTRACT_TEAMS_PROMPT + "\n{text}"

        prompt = PromptTemplate(
            template=template,
            input_variables=["text"]
        )

        # Build chain
        chain = prompt | llm

        # Invoke model
        logger.info("📡 Calling Gemini API...")
        response = chain.invoke({"text": text})
        content = response.content.strip()
        
        logger.info(f"📥 Received response from Gemini (length: {len(content)} chars)")
        logger.debug(f"Raw response: {content[:200]}...")  # Log first 200 chars

        # Remove backticks if LLM adds them
        content = content.replace("```json", "").replace("```", "").strip()

        # Extract only the JSON array using regex
        json_match = re.search(r"\[[\s\S]*\]", content)
        if not json_match:
            logger.error("❌ No JSON array found in LLM output")
            logger.debug(f"Content received: {content}")
            raise ValueError("No JSON array found in LLM output")

        json_text = json_match.group(0)
        logger.debug(f"Extracted JSON: {json_text[:200]}...")
        
        teams = json.loads(json_text)

        # Force all entries to strings
        if isinstance(teams, list):
            teams = [str(t).strip() for t in teams if t]  # Also strip and filter empty
        else:
            logger.warning("⚠️ Parsed result is not a list, returning empty array")
            teams = []

        logger.info(f"✅ Successfully extracted {len(teams)} teams")
        logger.debug(f"Teams: {teams}")
        
        return teams

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON parsing error: {e}")
        logger.debug(f"Failed to parse: {json_text if 'json_text' in locals() else 'N/A'}")
        raise ValueError(f"Failed to parse JSON from AI response: {e}")
    
    except Exception as e:
        logger.error(f"❌ Error extracting teams: {type(e).__name__}: {e}", exc_info=True)
        raise