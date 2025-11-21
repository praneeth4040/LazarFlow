import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import CommaSeparatedListOutputParser
import json

def extract_teams_from_text(text):
    """
    Extracts a list of team names from unstructured text using Google Gemini.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    # Initialize Gemini model
    llm = ChatGoogleGenerativeAI(model = "gemini-2.5-pro", google_api_key=api_key)

    # Define the prompt template
    template = """
    You are an AI assistant that extracts esports team names from unstructured text.
    
    Extract the team names from the following text. 
    Return ONLY a valid JSON array of strings, where each string is a team name.
    Do not include any other text, markdown formatting, or explanations.
    
    Text:
    {text}
    
    JSON Output:
    """
    
    prompt = PromptTemplate(
        template=template,
        input_variables=["text"]
    )

    # Create the chain
    chain = prompt | llm

    try:
        # Run the chain
        response = chain.invoke({"text": text})
        
        # Parse the response content
        content = response.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        content = content.strip()
        
        # Parse JSON
        teams = json.loads(content)
        
        # Ensure it's a list of strings
        if isinstance(teams, list):
            return [str(team) for team in teams]
        else:
            return []
            
    except Exception as e:
        print(f"Error extracting teams: {e}")
        return []
