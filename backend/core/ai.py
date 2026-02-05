from groq import Groq
import json
from typing import Dict, Any, List
from models import ApiEndpoint

def generate_ai_test_data(api_key: str, endpoints: List[ApiEndpoint]) -> Dict[str, Any]:
    client = Groq(api_key=api_key)
    
    # Simplify endpoints for prompt to save tokens and focus on schema
    schema_summary = []
    for ep in endpoints:
        schema_summary.append({
            "path": ep.path,
            "method": ep.method,
            "operationId": ep.operationId or f"{ep.method}_{ep.path}",
            "parameters": [p["name"] for p in ep.parameters if p.get("in") in ["path", "query"]],
            "body_schema": ep.requestBody  # rudimentary, might need specific extraction
        })

    prompt = f"""
    You are a QA Automation Engineer. Generate a comprehensive JSON test data set for the following API endpoints.
    
    Rules:
    1. Output ONLY valid JSON. No markdown, no comments.
    2. The JSON structure must be keyed by 'operationId' (or 'METHOD_path' if operationId is missing).
    3. Provide realistic data for 'body' (for POST/PUT) and 'parameters' (for path/query).
    4. Ensure dependencies are respected (e.g. if create_user returns an ID, use {{create_user.id}} in subsequent get_user calls).
    5. Generate success scenarios.
    
    API Def:
    {json.dumps(schema_summary, indent=2)}
    """
    
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful JSON data generator for API testing."},
                {"role": "user", "content": prompt}
            ],
            model="llama3-70b-8192",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = completion.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {"error": str(e), "details": "Failed to generate data via Groq"}
