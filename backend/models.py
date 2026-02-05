from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Union

class TestData(BaseModel):
    variables: Dict[str, Any] = {}
    requests: Dict[str, Any] = {} # Keyed by operationId or path+method

class ApiEndpoint(BaseModel):
    path: str
    method: str
    summary: Optional[str] = None
    operationId: Optional[str] = None
    tags: List[str] = []
    parameters: List[Dict[str, Any]] = []
    requestBody: Optional[Dict[str, Any]] = None
    responses: Dict[str, Any] = {}
    security: List[Dict[str, Any]] = []

class SwaggerDoc(BaseModel):
    openapi: str
    info: Dict[str, Any]
    servers: List[Dict[str, Any]] = []
    paths: Dict[str, Dict[str, Any]]
    components: Dict[str, Any] = {}
