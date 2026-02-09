from groq import Groq
import json
from typing import Dict, Any, List, Optional
from models import ApiEndpoint, TestExecutionResult

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
            model="llama-3.3-70b-versatile",
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

def chat_with_context(api_key: str, endpoints: List[ApiEndpoint], user_message: str, history: List[Dict[str, str]], results: List[TestExecutionResult]) -> str:
    client = Groq(api_key=api_key)
    
    # Summarize API context to keep tokens manageable
    context_summary = []
    for ep in endpoints:
        context_summary.append(f"{ep.method} {ep.path} - {ep.summary or 'No summary'}")
        
    # Summarize Test Results
    passed_tests = [r.endpoint for r in results if r.passed]
    failed_tests = [f"{r.method} {r.endpoint} (Error: {r.error or r.response})" for r in results if not r.passed]
    
    test_status_section = ""
    if results:
        test_status_section = f"""
        CURRENT TEST EXECUTION STATUS:
        People are asking about "working" APIs. You have this real-time data:
        - Total Tests Run: {len(results)}
        - Passed: {len(passed_tests)}
        - Failed: {len(failed_tests)}
        
        Failed Endpoints Details:
        {json.dumps(failed_tests, indent=2)}
        """

    system_prompt = f"""
    You are an intelligent API Assistant for a QA Automation Engineer.
    You have access to the following API Endpoints:
    
    {json.dumps(context_summary, indent=2)}
    
    {test_status_section}
    
    Your goal is to help the user understand the API, suggest test scenarios, or debug issues.
    If the user asks "how many APIs are working?", use the CURRENT TEST EXECUTION STATUS data provided above.
    If no tests have been run yet, explicitly state that you haven't seen any test results yet.
    Be concise, technical, and helpful.
    """
    
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Add history
    for msg in history[-10:]: # Keep last 10 messages for context window management
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": user_message})
    
    try:
        completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error communicating with AI: {str(e)}"
