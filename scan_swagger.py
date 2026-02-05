
import httpx
import asyncio

async def scan():
    base = "https://api.cholacabs.in"
    paths = [
        "/openapi.json",
        "/api/openapi.json",
        "/api/v1/openapi.json",
        "/v1/openapi.json",
        "/docs",
        "/api/docs",
        "/api/v1/docs",
        "/swagger.json",
        "/api/swagger.json"
    ]
    
    async with httpx.AsyncClient(verify=False) as client:
        for p in paths:
            url = base + p
            try:
                resp = await client.get(url, timeout=5)
                print(f"[{resp.status_code}] {url} (Content-Type: {resp.headers.get('content-type')})")
            except Exception as e:
                print(f"[ERR] {url} : {e}")

if __name__ == "__main__":
    asyncio.run(scan())
