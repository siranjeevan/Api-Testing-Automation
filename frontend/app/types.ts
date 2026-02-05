export interface ApiEndpoint {
    path: string;
    method: string;
    summary?: string;
    operationId?: string;
    description?: string;
    parameters?: any[];
    responses?: any;
    tags?: string[];
}

export interface TestExecutionResult {
    endpoint: string;
    method: string;
    status: number;
    time: number;
    passed: boolean;
    response: any;
    error?: string;
}

export interface GlobalState {
    baseUrl: string;
    openapiUrl: string;
    environment: 'local' | 'dev' | 'staging' | 'prod';
    variables: Record<string, any>;
    testData: string; // JSON string
    endpoints: ApiEndpoint[];
    results: TestExecutionResult[];
}
