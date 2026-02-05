
import asyncio
import httpx
import json
from typing import Dict, Any, List
from backend.models import ApiEndpoint



async def fetch_swagger(url: str) -> Dict[str, Any]:
    # 1. Clean URL logic
    original_url = url
    candidates = [url]

    # If it looks like a UI URL, prioritize the likely JSON path
    if "docs" in url or "redoc" in url:
        base = url.split("#")[0]
        if base.endswith("/"): base = base[:-1] # strip trailing slash
        
        # conversions
        json_url = base.replace("/docs", "/openapi.json").replace("/redoc", "/openapi.json")
        candidates.insert(0, json_url) # Try this first
        
    # Add other common fallbacks
    base_domain = url.split("/docs")[0].split("/redoc")[0] # naive string split
    if base_domain != url:
        candidates.append(f"{base_domain}/api/openapi.json")
        candidates.append(f"{base_domain}/api/v1/openapi.json")
        candidates.append(f"{base_domain}/v1/openapi.json")

    # Remove duplicates while preserving order
    candidates = list(dict.fromkeys(candidates))



    # Parallel fetch for speed
    async def try_url(client, u):
        try:
            print(f"Checking: {u}")
            # Short timeout to fail fast
            resp = await client.get(u, timeout=5.0, follow_redirects=True)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except:
                    pass
        except Exception as e:
            print(f"Failed {u}: {e}")
        return None

    # Use a context manager that doesn't close until all tasks are done/cancelled
    async with httpx.AsyncClient(verify=False, headers={"User-Agent": "Mozilla/5.0"}) as client:
        # Create all tasks
        tasks = [asyncio.create_task(try_url(client, u)) for u in candidates]
        
        try:
            # Wait for the FIRST success
            for future in asyncio.as_completed(tasks):
                result = await future
                if result:
                    # Cancel remaining
                    for t in tasks: t.cancel()
                    return result
        except Exception as e:
            print(f"Search error: {e}")
        
    raise Exception(f"Could not find valid openapi.json in {len(candidates)} locations.")

def parse_swagger_endpoints(swagger_json: Dict[str, Any]) -> List[ApiEndpoint]:
    endpoints = []
    paths = swagger_json.get("paths", {})
    
    for path, methods in paths.items():
        for method, details in methods.items():
            if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                continue
                
            endpoints.append(ApiEndpoint(
                path=path,
                method=method.upper(),
                summary=details.get("summary"),
                operationId=details.get("operationId"),
                tags=details.get("tags", []),
                parameters=details.get("parameters", []),
                requestBody=details.get("requestBody"),
                responses=details.get("responses", {}),
                security=details.get("security", [])
            ))
            
    # Simple heuristic sorting: Auth -> Create -> Read -> Update -> Delete
    # This is rudimentary and would need refinement
    def sort_key(e: ApiEndpoint):
        m = e.method.upper()
        p = e.path.lower()
        score = 10
        
        if "auth" in p or "login" in p:
            score = 1
        elif m == "POST":
            score = 2
        elif m == "GET":
            score = 3
        elif m == "PUT" or m == "PATCH":
            score = 4
        elif m == "DELETE":
            score = 5
            
        return score
        
    endpoints.sort(key=sort_key)
    return endpoints
