from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import httpx
import logging

from .models import ApiEndpoint
from .core.parser import fetch_swagger, parse_swagger_endpoints
from .core.runner import execute_test_step
from .core.ai import generate_ai_test_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Antigravity API Automation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseRequest(BaseModel):
    url: str

class GenerateDataRequest(BaseModel):
    apiKey: str
    endpoints: List[ApiEndpoint]

class RunRequest(BaseModel):
    baseUrl: str
    endpoints: List[ApiEndpoint]
    testData: Dict[str, Any]
    variables: Dict[str, Any]

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/parse")
async def parse_api(request: ParseRequest):
    logger.info(f"Parsing Swagger from: {request.url}")
    try:
        swagger = await fetch_swagger(request.url)
        endpoints = parse_swagger_endpoints(swagger)
        return {"endpoints": endpoints, "raw": swagger}
    except Exception as e:
        logger.error(f"Error parsing swagger: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/generate-data")
async def generate_data(request: GenerateDataRequest):
    logger.info("Generating test data using AI")
    try:
        data = generate_ai_test_data(request.apiKey, request.endpoints)
        return {"testData": data}
    except Exception as e:
        logger.error(f"Error generating data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run")
async def run_tests(request: RunRequest):
    logger.info("Starting test execution")
    results = []
    async with httpx.AsyncClient() as client:
        for endpoint in request.endpoints:
            # Execute step
            result = await execute_test_step(
                client, 
                endpoint, 
                request.baseUrl, 
                request.variables, 
                request.testData
            )
            results.append(result)
            
            # Simple stop on failure for now? Or continue?
            # User requirement: "Pass/Fail indicators per API" implies continue.
            
            # Update variables from response if needed (Feature: runtime variables)
            # This logic needs to be added to runner.py or here.
            # Simplified for now.
            
    return {"results": results}
