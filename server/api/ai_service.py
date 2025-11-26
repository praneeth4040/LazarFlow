import os
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate


def extract_teams_from_text(text):
    """
    Extracts a list of team names from unstructured text using Google Gemini
    and returns a JSON object compatible with your frontend.
    """

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    # Initialize Gemini model
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro",
        google_api_key=api_key
    )

    # Prompt template
    template = """
    You are an AI that extracts esports team names from unstructured text.

    Extract ONLY the team names and return ONLY a JSON array of strings.
    NO explanations, NO markdown.

    Text:
    {text}

    JSON Output:
    """

    prompt = PromptTemplate(
        template=template,
        input_variables=["text"]
    )

    # Build chain
    chain = prompt | llm

    try:
        # Invoke model
        response = chain.invoke({"text": text})
        content = response.content.strip()

        # Remove backticks if LLM adds them
        content = content.replace("```json", "").replace("```", "").strip()

        # Extract only the JSON array using regex (very safe)
        json_match = re.search(r"\[[\s\S]*\]", content)
        if not json_match:
            raise ValueError("No JSON array found in LLM output")

        json_text = json_match.group(0)
        teams = json.loads(json_text)

        # Force all entries to strings
        if isinstance(teams, list):
            teams = [str(t) for t in teams]
        else:
            teams = []

        # Final response (IMPORTANT FOR FRONTEND)
        return {
            "success": True,
            "teams": teams
        }

    except Exception as e:
        print("Error extracting teams:", e)
        return {
            "success": False,
            "teams": []
        }