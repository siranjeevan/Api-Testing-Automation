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
    
    # 0. Get specific data for this endpoint
    op_id = endpoint.operationId or f"{endpoint.method.upper()}_{endpoint.path}"
    op_data = test_data.get(op_id, {})
    print(f"DEBUG: Executing {endpoint.method} {endpoint.path} (OpId: {op_id})")
    print(f"DEBUG: Op Data found: {list(op_data.keys())}")
    
    # 1. Substitute Variables in URL
    # Context includes global variables, global test data, and this operation's specific parameters
    context = {**variables, **test_data, **op_data.get("parameters", {})}
    
    def replace_placeholders(text: str, ctx: Dict[str, Any]) -> str:
        # Sort keys by length descending to avoid partial matches
        for k in sorted(ctx.keys(), key=len, reverse=True):
            v = ctx[k]
            # Handle string/int values
            if isinstance(v, (str, int, float, bool)):
                text = text.replace(f"{{{{{k}}}}}", str(v))
                text = text.replace(f"{{{k}}}", str(v))
            # Handle nested objects (rudimentary)
            elif isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    if isinstance(sub_v, (str, int, float, bool)):
                        text = text.replace(f"{{{{{k}.{sub_k}}}}}", str(sub_v))
                        text = text.replace(f"{{{k}.{sub_k}}}", str(sub_v))
        return text

    # Normalize URL segments
    base = base_url.rstrip("/")
    path = endpoint.path.lstrip("/")
    url = f"{base}/{path}"
    url = replace_placeholders(url, context)

    # 2. Extract Parameters (Path and Query)
    path_params = {}
    query_params = {}
    
    if endpoint.parameters:
        for param in endpoint.parameters:
            p_name = param["name"]
            p_in = param.get("in", "query")
            val = context.get(p_name)
            
            # If not in context, check if it's a template we need to replace
            if val is None:
                # Attempt to find it in variables or test_data if not found in context
                val = variables.get(p_name) or test_data.get(p_name)

            if val is not None:
                # Format booleans for URLs correctly (true/false instead of True/False)
                # Handle both actual booleans and strings that look like booleans
                str_val = str(val)
                if isinstance(val, bool) or (isinstance(val, str) and val.lower() in ['true', 'false']):
                    str_val = str_val.lower()
                
                if p_in == "path":
                    path_params[p_name] = str_val
                elif p_in == "query":
                    query_params[p_name] = str_val

    # Substitute Path Parameters in URL
    for p_name, val in path_params.items():
        url = url.replace(f"{{{p_name}}}", val)
    
    # 3. Prepare Body
    body = op_data.get("body")
    if body is not None and endpoint.method.upper() in ["POST", "PUT", "PATCH"]:
        def resolve_body_placeholders(obj):
            if isinstance(obj, str):
                stripped = obj.strip()
                if (stripped.startswith("{{") and stripped.endswith("}}")) or (stripped.startswith("{") and stripped.endswith("}")):
                    key = stripped.strip("{}")
                    if key in context:
                        return context[key]
                return replace_placeholders(obj, context)
            elif isinstance(obj, dict):
                return {k: resolve_body_placeholders(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [resolve_body_placeholders(i) for i in obj]
            return obj

        body = resolve_body_placeholders(body)
        print(f"DEBUG: Resolved Body: {body}")
    else:
        body = None # Don't send body for GET/DELETE unless specified
    
    # 4. Request
    start_time = time.time()
    
    req_headers = variables.get("headers", {})
    if not req_headers and "headers" in test_data:
        req_headers = test_data["headers"]

    try:
        response = await client.request(
            method=endpoint.method,
            url=url,
            json=body,
            params=query_params,
            headers=req_headers,
            timeout=10.0
        )
        
        duration = (time.time() - start_time) * 1000
        
        resp_data = None
        content_type = response.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            try:
                resp_data = response.json()
            except:
                resp_data = response.text
        else:
            resp_data = response.text

        if not resp_data and resp_data != 0 and resp_data != False:
             resp_data = "No Data"

        passed = response.status_code < 400
        
        if passed and isinstance(resp_data, dict):
            if resp_data.get("success") is False or resp_data.get("error") is True:
                passed = False

        return {
            "endpoint": endpoint.path,
            "method": endpoint.method,
            "status": response.status_code,
            "time": duration,
            "passed": passed,
            "response": resp_data,
            "request_body": body,
            "url": str(response.url) # Actual URL used
        }

    except Exception as e:
        return {
            "endpoint": endpoint.path,
            "method": endpoint.method,
            "status": 0,
            "time": 0,
            "passed": False,
            "response": None,
            "request_body": body,
            "error": str(e),
            "url": url
        }
