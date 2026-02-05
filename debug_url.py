
import httpx
import asyncio

async def check():
    urls = [
        "https://api.cholacabs.in/api/openapi.json",
        "https://api.cholacabs.in/v1/openapi.json",
        "https://api.cholacabs.in/api/v1/openapi.json",
        "https://api.cholacabs.in/docs"
    ]
    async with httpx.AsyncClient(verify=False) as client:
        for url in urls:
            try:
                print(f"Checking {url}...")
                resp = await client.get(url, timeout=5)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200 and "docs" in url:
                    print("Docs page found. It often loads OpenAPI from ./openapi.json relative to itself.")
            except Exception as e:
                print(f"Error {url}: {e}")

if __name__ == "__main__":
    asyncio.run(check())
