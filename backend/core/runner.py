import httpx
import time
from typing import Dict, Any, List
from models import ApiEndpoint

async def execute_test_step(
    client: httpx.AsyncClient, 
    endpoint: ApiEndpoint, 
    base_url: str, 
    variables: Dict[str, Any],
    test_data: Dict[str, Any]
) -> Dict[str, Any]:
    
    # 1. Substitute Variables in URL
    # Combine variables and test data for lookup
    context = {**variables, **test_data}
    
    # Helper to replace {{var}} and {var}
    def replace_placeholders(text: str, ctx: Dict[str, Any]) -> str:
        for k, v in ctx.items():
            if v is not None:
                text = text.replace(f"{{{{{k}}}}}", str(v)) # {{key}}
                text = text.replace(f"{{{k}}}", str(v))     # {key}
        return text

    url = f"{base_url}{endpoint.path}"
    url = replace_placeholders(url, context)
    
    # Also replace path parameters explicitly defined in Swagger if missing
    if endpoint.parameters:
        for param in endpoint.parameters:
            if param.get("in") == "path":
                p_name = param["name"]
                if p_name in context:
                    val = context[p_name]
                    url = url.replace(f"{{{p_name}}}", str(val))

    # 2. Prepare Body
    body = None
    if endpoint.method in ["POST", "PUT", "PATCH"]:
        # Look for body data matching the operationId or path
        # Assuming test_data structured by operationId for simplicity
        op_id = endpoint.operationId or f"{endpoint.method}_{endpoint.path}"
        body = test_data.get(op_id, {}).get("body")
    
    # 3. Request
    start_time = time.time()
    
    # Merge headers from variables and test_data
    req_headers = variables.get("headers", {})
    if not req_headers and "headers" in test_data:
        req_headers = test_data["headers"]

    try:
        response = await client.request(
            method=endpoint.method,
            url=url,
            json=body,
            headers=req_headers,
            timeout=10.0
        )
        
        duration = (time.time() - start_time) * 1000
        passed = response.status_code < 400
        
        # Safe JSON extraction
        resp_content = response.text
        if "application/json" in response.headers.get("content-type", ""):
            try:
                resp_content = response.json()
            except:
                pass

        return {
            "endpoint": endpoint.path,
            "method": endpoint.method,
            "status": response.status_code,
            "time": duration,
            "passed": passed,
            "response": resp_content
        }

    except Exception as e:
        return {
            "endpoint": endpoint.path,
            "method": endpoint.method,
            "status": 0,
            "time": 0,
            "passed": False,
            "error": str(e)
        }
