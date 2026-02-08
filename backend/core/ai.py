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
        print(f"Error calling Groq: {e}")
        raise e

def diagnose_error(api_key: str, endpoint: Dict[str, Any], request_body: Any, response_body: Any) -> Dict[str, Any]:
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are an expert API Debugger. Analyze the following API failure.
    
    API Endpoint: {endpoint.get('method')} {endpoint.get('path')}
    Request Body Sent: {json.dumps(request_body, indent=2)}
    Response Received: {json.dumps(response_body, indent=2)}
    
    Task:
    1. Determine if this is an "INPUT_ISSUE" (the user sent bad data) or an "API_ISSUE" (the server code is logically broken).
    2. If it is an "INPUT_ISSUE", provide the corrected JSON request body that will make the API pass.
    3. If it is an "API_ISSUE", explain why the server is failing.
    
    Rules:
    - Return ONLY a JSON object.
    - Structure: 
      {{
        "diagnosis": "INPUT_ISSUE" | "API_ISSUE",
        "explanation": "Short clear explanation in simple English",
        "suggested_fix": {{ ... corrected JSON body if input issue ... }}
      }}
    """
    
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a specialized AI for debugging API failures."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}
