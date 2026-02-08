"use client";
import React from 'react';
import styles from './page.module.css';
import { ApiEndpoint, TestExecutionResult } from './types';

export default function Home() {
    const [sidebarExpanded, setSidebarExpanded] = React.useState(true);
    const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
    const [autoParams, setAutoParams] = React.useState<Record<string, any>>({});
    const [errorDrawerOpen, setErrorDrawerOpen] = React.useState(false);
    const [warningDrawerOpen, setWarningDrawerOpen] = React.useState(false);
    
    // START: Payload Configuration State
    const [schemas, setSchemas] = React.useState<Record<string, any>>({});
    const [manualBodies, setManualBodies] = React.useState<Record<string, string>>({});
    const [aiDiagnoses, setAiDiagnoses] = React.useState<Record<string, { diagnosis: 'INPUT_ISSUE' | 'API_ISSUE', explanation: string, suggested_fix?: any }>>({});
    
    // Helper to generate dummy data from schema
    const generateFromSchema = (schema: any, depth = 0, fieldName = ''): any => {
        if (!schema || depth > 5) return {};

        // Resolve $ref placeholders
        if (schema.$ref) {
            const parts = schema.$ref.split('/');
            const name = parts[parts.length - 1];
            const resolved = schemas[name];
            if (resolved) {
                return generateFromSchema(resolved, depth + 1, fieldName);
            }
            return `<REF:${name}>`;
        }

        const lowerName = (fieldName || "").toLowerCase();

        // 🚀 SMART DEPENDENCY RESOLUTION: Use global learned context (autoParams)
        // Check for specific match first, then broader patterns
        const specificKey = Object.keys(autoParams).find(k => k === fieldName || k === lowerName || (k.toLowerCase() === lowerName));
        if (specificKey) return `{{${specificKey}}}`;

        // If it's an ID field, always use a specific placeholder name to avoid collisions
        // Even if we don't have it yet, we want runEndpoint to fetch it specifically.
        if (lowerName.includes('id') || lowerName.endsWith('_id') || lowerName.endsWith('id')) {
            return `{{${fieldName}}}`;
        }

        if (schema.example) return schema.example;
        if (schema.default !== undefined) return schema.default;
        
        if (schema.allOf) {
            let merged: any = {};
            schema.allOf.forEach((sub: any) => {
                merged = { ...merged, ...generateFromSchema(sub, depth + 1, fieldName) };
            });
            return merged;
        }

        if (schema.anyOf || schema.oneOf) {
            const sub = (schema.anyOf || schema.oneOf)[0];
            return generateFromSchema(sub, depth + 1, fieldName);
        }

        if (schema.properties) {
            const obj: any = {};
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                obj[key] = generateFromSchema(prop, depth + 1, key);
            }
            return obj;
        }
        
        if (schema.items) {
            return [generateFromSchema(schema.items, depth + 1, fieldName)];
        }

        const type = schema.type?.toLowerCase();

        if (type === "string") {
            if (schema.format === "date-time") return new Date().toISOString();
            if (schema.format === "date") return new Date().toISOString().split('T')[0];
            if (schema.enum) return schema.enum[0];
            
            // Smart context-aware generation
            if (lowerName.includes('phone')) {
                return "" + (Math.floor(Math.random() * 3) + 7) + Math.floor(100000000 + Math.random() * 900000000);
            }
            if (lowerName.includes('email')) {
                const prefix = fieldName.split('_').join('').split('-').join('');
                const rand = Math.floor(Math.random() * 1000);
                return `${prefix}${rand}@gmail.com`;
            }
            if (lowerName.includes('name')) {
                const rand = Math.floor(Math.random() * 1000);
                return `${fieldName} ${rand}`;
            }

            return "string";
        }
        if (type === "integer" || type === "number") {
            if (lowerName.includes('age')) return Math.floor(Math.random() * 50) + 18;
            if (lowerName.includes('count') || lowerName.includes('quantity')) return Math.floor(Math.random() * 10) + 1;
            return 0;
        }
        if (type === "boolean") return true;
        
        return {};
    };
    // END: Payload Configuration State

    const [config, setConfig] = React.useState({
        baseUrl: 'http://localhost:8000',
        openapiUrl: 'http://localhost:8000/openapi.json',
        environment: 'local',
        apiKey: ''
    });

    const [endpoints, setEndpoints] = React.useState<ApiEndpoint[]>([]);
    const [testData, setTestData] = React.useState('{\n  "users": []\n}');
    const [results, setResults] = React.useState<TestExecutionResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [tab, setTab] = React.useState('setup');

    // Load persisted state on mount
    React.useEffect(() => {
        const savedConfig = localStorage.getItem('ag_config');
        if (savedConfig) {
            try { setConfig(JSON.parse(savedConfig)); } catch (e) {}
        }
        const savedTestData = localStorage.getItem('ag_test_data');
        if (savedTestData) {
            setTestData(savedTestData);
        }
        const savedSchemas = localStorage.getItem('ag_schemas');
        if (savedSchemas) {
            try { setSchemas(JSON.parse(savedSchemas)); } catch (e) {}
        }
    }, []);

    React.useEffect(() => {
        if (config.openapiUrl !== 'http://localhost:8000/openapi.json' || config.baseUrl !== 'http://localhost:8000') {
             localStorage.setItem('ag_config', JSON.stringify(config));
        }
    }, [config]);

    React.useEffect(() => {
        if (testData !== '{\n  "users": []\n}') {
            localStorage.setItem('ag_test_data', testData);
        }
    }, [testData]);

    React.useEffect(() => {
        if (Object.keys(schemas).length > 0) {
            localStorage.setItem('ag_schemas', JSON.stringify(schemas));
        }
    }, [schemas]);




    const parseSwagger = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: config.openapiUrl })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to fetch');
            }
            const data = await res.json();
            if (data.endpoints) {
                setEndpoints(data.endpoints);
                let detectedUrl = '';
                if (data.raw?.servers?.length > 0) {
                    detectedUrl = data.raw.servers[0].url;
                }
                if (!detectedUrl || !detectedUrl.startsWith('http')) {
                    try {
                        const urlObj = new URL(config.openapiUrl);
                        detectedUrl = urlObj.origin;
                    } catch (e) { }
                }
                if (detectedUrl) {
                    setConfig((prev: any) => ({ ...prev, baseUrl: detectedUrl }));
                }
                const swaggerSchemas = data.raw?.components?.schemas || data.raw?.definitions || {};
                setSchemas(swaggerSchemas);
                setTab('run-get');
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error: ${e.message || 'Failed to parse Swagger'}`);
        } finally {
            setLoading(false);
        }
    };

    const executeStep = async (ep: ApiEndpoint, passedContext: Record<string, any>, retryCount = 0, forcedBody?: any): Promise<Record<string, any>> => {
        let currentContext = { ...passedContext };
        const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
        
        if (retryCount === 0) {
            setAiDiagnoses(prev => {
                const next = { ...prev };
                delete next[opId];
                return next;
            });
        }

        let bodyToAnalyze = forcedBody || {};
        if (!forcedBody) {
            if (manualBodies[opId]) {
                try { bodyToAnalyze = JSON.parse(manualBodies[opId]); } catch(e) {}
            } else {
                try {
                    const globalData = JSON.parse(testData);
                    bodyToAnalyze = globalData[opId]?.body || bodyToAnalyze;
                } catch(e) {}
            }
        }
        
        const bodyString = JSON.stringify(bodyToAnalyze);
        
        // Collect needed variables from path and body templates
        const needed = [
            ...(ep.path.match(/\{([^}]+)\}/g) || []),
            ...(bodyString.match(/\{\{([^}]+)\}\}/g) || [])
        ];
        
        // ALSO: Scan body for any `_id` fields that have placeholder values
        // This handles cases like { "driver_id": "string" } which need resolution
        const scanBodyForIdFields = (obj: any, prefix = ''): string[] => {
            const foundIds: string[] = [];
            if (!obj || typeof obj !== 'object') return foundIds;
            
            Object.entries(obj).forEach(([key, val]) => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (key.toLowerCase().endsWith('_id') || key.toLowerCase().endsWith('id')) {
                    // Check if value is a placeholder (empty, 'string', null, 0, or looks like a template)
                    if (val === null || val === '' || val === 'string' || val === 0 || 
                        (typeof val === 'string' && (val.includes('{{') || val === 'uuid'))) {
                        foundIds.push(`{${key}}`);
                    }
                }
                if (typeof val === 'object' && val !== null) {
                    foundIds.push(...scanBodyForIdFields(val, fullKey));
                }
            });
            return foundIds;
        };
        
        needed.push(...scanBodyForIdFields(bodyToAnalyze));

        for (const varName of Array.from(new Set(needed))) {
            const cleanVar = varName.replace(/[\{\}]/g, '');
            if (!currentContext[cleanVar]) {
                const searchKey = cleanVar.replace('_id', '').toLowerCase();
                
                // Find ALL potential producers, then pick the BEST one (shortest path = base list endpoint)
                const potentialProducers = endpoints.filter(e => {
                    if (e.method.toUpperCase() !== 'GET' || e.path.includes('{')) return false;
                    const path = e.path.toLowerCase();
                    const opIdDesc = (e.operationId || "").toLowerCase();
                    const tags = (e.tags || []).map(t => t.toLowerCase());
                    
                    const pluralKey = searchKey + 's';
                    return path.endsWith(`/${pluralKey}`) || path.endsWith(`/${searchKey}`) || 
                           path.includes(searchKey) || opIdDesc.includes(searchKey) || tags.some(t => t.includes(searchKey));
                });
                
                // Sort by path length (shortest first) - this prioritizes /api/drivers over /api/drivers/check-phone
                potentialProducers.sort((a, b) => a.path.length - b.path.length);
                const producer = potentialProducers[0];

                if (producer) {
                    try {
                        const pRes = await fetch('http://localhost:8000/run-step', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ baseUrl: config.baseUrl, endpoint: producer, variables: currentContext })
                        });
                        const pData = await pRes.json();
                        if (pData.results?.[0]?.response) {
                            const learned = extractIdentifiers(pData.results[0].response);
                            const parts = producer.path.split('/').filter(Boolean);
                            const pName = parts[parts.length - 1] || 'data';
                            const pSingular = pName.endsWith('s') ? pName.slice(0, -1) : pName;
                            
                            if (learned['id']) {
                                if (!learned[cleanVar]) learned[cleanVar] = learned['id'];
                                learned[`${pSingular}_id`] = learned['id'];
                            }

                            // Fuzzy Logic: If exact key not found, try to find ANY relevant ID from the producer
                            if (!learned[cleanVar]) {
                                const candidates = Object.keys(learned).filter(k => 
                                    k.toLowerCase().endsWith('id') || k.toLowerCase().endsWith('uuid')
                                );
                                // Prefer the shortest key usually (id vs transaction_id)? or longest?
                                // Let's pick the first one that is NOT the cleanVar itself (obviously)
                                const validCandidate = candidates.find(c => c !== cleanVar);
                                if (validCandidate) {
                                    learned[cleanVar] = learned[validCandidate];
                                }
                            }

                            currentContext = { ...currentContext, ...learned };
                        }
                    } catch(e) {}
                }
            }
        }

        // DEBUG: Log context before path resolution
        console.log(`[executeStep] ${ep.method} ${ep.path} - Context keys:`, Object.keys(currentContext));

        let resolvedPath = ep.path;
        (ep.path.match(/\{([^}]+)\}/g) || []).forEach(p => {
            const key = p.slice(1, -1);
            const val = currentContext[key];
            
            // DEBUG: Log each variable resolution
            console.log(`[Path Resolve] Looking for '${key}' in context:`, val ? `FOUND (${val})` : 'NOT FOUND');
            
            if (val) {
                resolvedPath = resolvedPath.replace(p, val);
            } else {
                // If not found, try fallback to generic 'id' or 'uuid'
                const fallback = currentContext['id'] || currentContext['uuid'];
                if (fallback) {
                    console.log(`[Path Resolve] Using fallback ID:`, fallback);
                    resolvedPath = resolvedPath.replace(p, fallback);
                }
            }
        });
        
        console.log(`[executeStep] Resolved path:`, resolvedPath);

        if (Object.keys(bodyToAnalyze).length === 0 && ep.requestBody) {
           const content = ep.requestBody?.content?.["application/json"];
           if (content?.schema) bodyToAnalyze = generateFromSchema(content.schema);
        }

        try {
            const runRes = await fetch('http://localhost:8000/run-step', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    baseUrl: config.baseUrl, 
                    endpoint: { ...ep, path: resolvedPath }, 
                    testData: { [opId]: { body: bodyToAnalyze } }, 
                    variables: currentContext 
                })
            });
            const runData = await runRes.json();
            const resultItem = runData.results?.[0];

            if (resultItem) {
                resultItem.endpoint = ep.path;
                setResults(prev => {
                    const other = prev.filter(r => !(r.endpoint === ep.path && r.method === ep.method));
                    return [...other, resultItem];
                });

                if (resultItem.passed) {
                    // Only clear diagnosis if it's NOT a healed state, 
                    // or if it's a fresh run without a previous diagnosis.
                    if (retryCount === 0) {
                        setAiDiagnoses(prev => {
                            const next = { ...prev };
                            delete next[opId];
                            return next;
                        });
                    }
                } else if (config.apiKey) {
                    // Start of AI Diagnosis Logic
                    try {
                        const diagR = await fetch('http://localhost:8000/diagnose', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiKey: config.apiKey, endpoint: ep, requestBody: bodyToAnalyze, responseBody: resultItem.response || resultItem.error })
                        });
                        const diagData = await diagR.json();
                        if (diagData.diagnosis) {
                            setAiDiagnoses(prev => ({ ...prev, [opId]: diagData }));
                            
                            // Fully Automatic AI Multi-Step Healing
                            if (diagData.diagnosis === 'INPUT_ISSUE' && diagData.suggested_fix && retryCount < 1) {
                                console.log(`[AI Auto-Healing] Encountered Input Issue on ${ep.path}. Applying fix and retrying...`);
                                
                                // WAIT for 1.5 seconds so the user can actually see the "INPUT GUIDANCE" box 
                                // before it automatically fixes itself.
                                await new Promise(r => setTimeout(r, 1500));
                                
                                const fixedContent = JSON.stringify(diagData.suggested_fix, null, 2);
                                setManualBodies(prev => ({ ...prev, [opId]: fixedContent }));
                                
                                const healedCtx = await executeStep(ep, currentContext, retryCount + 1, diagData.suggested_fix);
                                
                                setResults(prev => prev.map(r => 
                                    (r.endpoint === ep.path && r.method === ep.method && r.passed) 
                                    ? { ...r, healed: true } 
                                    : r
                                ));
                                
                return healedCtx;
                            }
                        }
                    } catch (e) {}
                }

                // Learn IDs from successful responses ONLY
                if (resultItem.passed && resultItem.response) {
                    const learned = extractIdentifiers(resultItem.response);
                    const pathSegments = ep.path.split('/').filter(Boolean);
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    if (lastSegment && !lastSegment.includes('{')) {
                        const singular = lastSegment.endsWith('s') ? lastSegment.slice(0, -1) : lastSegment;
                        ['id', 'uuid', '_id', 'userId'].forEach(idKey => {
                            if (learned[idKey]) {
                                learned[`${singular}_id`] = learned[idKey];
                                learned[`${singular}Id`] = learned[idKey];
                            }
                        });
                    }
                    console.log(`[Context] Learned from ${ep.path}:`, learned);
                    return { ...currentContext, ...learned };
                }
            }
    } catch (e) { console.error(e); }
    return currentContext;
};

    const runTests = async (methodFilter?: string, overrideEndpoints?: ApiEndpoint[]) => {
        if (!config.baseUrl) {
            alert("Please set a Target Base URL in the Setup tab.");
            setTab('setup');
            return;
        }
        
        const source = overrideEndpoints || endpoints;
        const targetEndpoints = methodFilter 
            ? source.filter(ep => ep.method.toUpperCase() === methodFilter.toUpperCase())
            : source;

        if (targetEndpoints.length === 0) {
            // Only alert if we AREN'T in an automatic trigger mode (like the initial GET run)
            if (!methodFilter || methodFilter !== 'GET') {
                console.warn(`No ${methodFilter || ''} endpoints found.`);
            }
            return;
        }

        setLoading(true);
        // Clear old results for these specific endpoints
        setResults(prev => prev.filter(r => !targetEndpoints.some(te => te.path === r.endpoint && te.method === r.method)));

        // Intelligent sequential execution
        const sorted = [...targetEndpoints].sort((a,b) => {
            // Priority 1: Producers (no path params) before Consumers (with path params)
            const aHasParam = a.path.includes('{');
            const bHasParam = b.path.includes('{');
            if (aHasParam && !bHasParam) return 1;
            if (!aHasParam && bHasParam) return -1;
            
            // Priority 2: Among producers, shorter paths first (base list endpoints first)
            // This ensures /api/drivers runs before /api/drivers/check-phone
            return a.path.length - b.path.length;
        });
        
        console.log('[Full Suite] Execution order:', sorted.map(e => e.path));

        let ctx = { ...autoParams };
        for(const ep of sorted) {
            ctx = await executeStep(ep, ctx);
            // Small delay to allow UI to update and user to see the "flow"
            await new Promise(r => setTimeout(r, 100));
        }

        setAutoParams(ctx);
        setLoading(false);
    };

    const generateData = async () => {
        if (!config.apiKey) {
            alert("Please enter a Groq API Key in Setup tab first.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/generate-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: config.apiKey,
                    endpoints: endpoints
                })
            });
            const data = await res.json();
            if (data.testData) {
                setTestData(JSON.stringify(data.testData, null, 2));
            }
        } catch (e) {
            alert("Failed to generate data");
        } finally {
            setLoading(false);
        }
    };

    const getResult = (ep: ApiEndpoint) => results.find(r => r.endpoint === ep.path && r.method === ep.method);

    const extractIdentifiers = (data: any) => {
        const found: Record<string, any> = {};
        const scan = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach(scan);
                return;
            }
            Object.entries(obj).forEach(([key, val]) => {
                // PRIORITIZE FIRST FOUND: Do not overwrite if key already exists.
                // This ensures we save the ID of the first item in a list, which is usually the intended consistency target.
                if (found[key]) return;

                if (val !== null && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) {
                    found[key] = val;
                } else {
                    scan(val);
                }
            });
        };
        scan(data);
        return found;
    };

    const categories = Array.from(new Set(endpoints.flatMap(ep => ep.tags || ['General']))).sort();
    const isRealError = (r: TestExecutionResult) => {
        if (r.passed) return false;
        
        // 1. Ignore 404s explicitly
        if (r.status === 404) return false;

        // 2. Ignore "Not Found" text patterns in the entire response body
        const responseStr = JSON.stringify(r.response || "").toLowerCase();
        const errorStr = (r.error || "").toLowerCase();
        
        if (responseStr.includes("not found") || errorStr.includes("not found")) return false;
        
        return true;
    };
    const failedCount = results.filter(isRealError).length;
    const warningCount = results.filter(r => !r.passed && !isRealError(r)).length;

    // Dynamic Navigation Logic
    const availableMethods = new Set(endpoints.map(ep => ep.method.toUpperCase()));
    const hasUploads = endpoints.some(ep => {
        const path = ep.path.toLowerCase();
        return path.includes('upload') || path.includes('image') || path.includes('file');
    });

    return (
        <div className={styles.container}>
            <aside className={`${styles.sidebar} ${!sidebarExpanded ? styles.collapsed : ''}`}>
                <button 
                    className={styles.collapseToggle} 
                    onClick={() => setSidebarExpanded(!sidebarExpanded)}
                    title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }}>
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                </button>

                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">AG Automation</h1>
                </div>
                <nav>
                    <div className={`${styles.navItem} ${tab === 'setup' ? styles.active : ''}`} onClick={() => setTab('setup')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>Configuration</span>
                    </div>
                    
                    {/* Dynamic Runners Section */}
                    {endpoints.length > 0 && <div className="mt-8 mb-2 px-4 text-[10px] uppercase tracking-widest text-dim font-bold opacity-50">Runners</div>}
                    
                    {availableMethods.has('GET') && (
                        <div className={`${styles.navItem} ${tab === 'run-get' ? styles.active : ''}`} onClick={() => setTab('run-get')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                            <span>GET Suite</span>
                        </div>
                    )}
                    
                    {availableMethods.has('POST') && (
                        <div className={`${styles.navItem} ${tab === 'run-post' ? styles.active : ''}`} onClick={() => setTab('run-post')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            <span>POST Suite</span>
                        </div>
                    )}
                    
                    {availableMethods.has('PUT') && (
                        <div className={`${styles.navItem} ${tab === 'run-put' ? styles.active : ''}`} onClick={() => setTab('run-put')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span>PUT Suite</span>
                        </div>
                    )}
                    
                    {availableMethods.has('PATCH') && (
                        <div className={`${styles.navItem} ${tab === 'run-patch' ? styles.active : ''}`} onClick={() => setTab('run-patch')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            <span>PATCH Suite</span>
                        </div>
                    )}
                    
                    {availableMethods.has('DELETE') && (
                        <div className={`${styles.navItem} ${tab === 'run-delete' ? styles.active : ''}`} onClick={() => setTab('run-delete')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            <span>DELETE Suite</span>
                        </div>
                    )}
                    
                    {hasUploads && (
                        <div className={`${styles.navItem} ${tab === 'run-upload' ? styles.active : ''}`} onClick={() => setTab('run-upload')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Asset Uploads</span>
                        </div>
                    )}
                </nav>
            </aside>
            <main className={styles.main}>
                {tab === 'setup' && (
                    <div className={styles.setupContainer}>
                        <div className={styles.setupIntro}>
                            <div>
                                <h2 className="text-5xl font-black tracking-tight leading-none mb-6">Initialize<br/>Workspace.</h2>
                                <p className="text-powder-blue/60 text-lg leading-relaxed max-w-sm">Connect your API blueprint and define target parameters to begin automated analysis.</p>
                            </div>

                            <div>
                                <div className={styles.statusRow}>
                                    <span className={styles.statusPill}>API ENGINE</span>
                                    <span className={styles.statusPill}>ENV MAPPING</span>
                                    <span className={styles.statusPill}>AI GEN</span>
                                </div>
                                <p className={styles.persistenceText}>
                                    AVIATION GRADE PERSISTENCE ACTIVE
                                </p>
                            </div>
                        </div>

                        <div className={styles.setupWorkspace}>
                            <div className={styles.setupGrid}>
                                <div className={styles.stepSection}>
                                    <div className={styles.stepHeader}>
                                        <div className={styles.stepNumber}>Phase 01</div>
                                        <h3 className={styles.stepTitle}>Blueprint Mapping</h3>
                                    </div>
                                    <div className={styles.card}>
                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label className={styles.label}>Swagger Source URL</label>
                                            <input
                                                className={styles.input}
                                                value={config.openapiUrl}
                                                onChange={e => setConfig({ ...config, openapiUrl: e.target.value })}
                                                placeholder="https://api.example.com/swagger.json"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.stepSection}>
                                    <div className={styles.stepHeader}>
                                        <div className={styles.stepNumber}>Phase 02</div>
                                        <h3 className={styles.stepTitle}>Execution Target</h3>
                                    </div>
                                    <div className={styles.card}>
                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label className={styles.label}>Environment Base URL</label>
                                            <input
                                                className={styles.input}
                                                value={config.baseUrl}
                                                onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                                placeholder="https://api.production.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.stepSection}>
                                    <div className={styles.stepHeader}>
                                        <div className={styles.stepNumber}>Phase 03</div>
                                        <h3 className={styles.stepTitle}>Intelligence Key</h3>
                                    </div>
                                    <div className={styles.card}>
                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label className={styles.label}>Groq Authorization</label>
                                            <input
                                                className={styles.input}
                                                value={config.apiKey}
                                                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                                placeholder="gsk_..."
                                                type="password"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {config.openapiUrl && config.baseUrl && (
                                <button className={`${styles.button} w-full py-5 text-lg rounded-xl mt-auto shadow-2xl`} onClick={parseSwagger} disabled={loading}>
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-4">
                                            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                            Initializing project context...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-4">
                                            <span>Finalize & Launch Workspace</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4-4-4"/><path d="M4 14V4h16v10Z"/><path d="M2 20h20"/></svg>
                                        </div>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}


                {(tab === 'run-get' || tab === 'run-post' || tab === 'run-put' || tab === 'run-patch' || tab === 'run-delete' || tab === 'run-upload') && (
                    <div className={styles.suiteContainer}>
                        {(() => {
                            const tabMethodMap: Record<string, string> = {
                                'run-get': 'GET',
                                'run-post': 'POST',
                                'run-put': 'PUT',
                                'run-patch': 'PATCH',
                                'run-delete': 'DELETE'
                            };
                            const m = tabMethodMap[tab];
                            const isUpload = tab === 'run-upload';
                            const filtered = endpoints.filter(ep => {
                                const path = ep.path.toLowerCase();
                                const hasFileInPath = path.includes('upload') || path.includes('image') || path.includes('file');
                                
                                // Check if any parameter is a file
                                const hasFileInParams = ep.parameters?.some(p => 
                                    p.type === 'file' || p.schema?.type === 'file' || p.schema?.format === 'binary'
                                );

                                // Check if request body has binary/file content
                                const hasFileInBody = ep.requestBody?.content?.["multipart/form-data"]?.schema?.properties && 
                                    Object.values(ep.requestBody.content["multipart/form-data"].schema.properties).some((p: any) => 
                                        p.format === 'binary' || p.type === 'file'
                                    );

                                const isUp = hasFileInPath || hasFileInParams || hasFileInBody;

                                if (isUpload) return isUp;
                                if (m) return ep.method.toUpperCase() === m && !isUp;
                                return false;
                            });

                            const suiteResults = filtered.map(ep => getResult(ep)).filter(Boolean);
                            const passedCount = suiteResults.filter(r => r?.passed).length;
                            const failedCount = suiteResults.length - passedCount;

                            // Extract unique tags and counts for the selector
                            const tagCounts = filtered.reduce((acc, ep) => {
                                const epTags = ep.tags || ['General'];
                                epTags.forEach(t => {
                                    acc[t] = (acc[t] || 0) + 1;
                                });
                                return acc;
                            }, {} as Record<string, number>);
                            
                            const uniqueTags = Object.keys(tagCounts).sort();
                            const activeTag = selectedTag || 'All';

                            return (
                                <>
                                    <div className={styles.suiteHeader}>
                                        <div className={styles.suiteTitleGroup}>
                                            <h2 className="animate-in fade-in slide-in-from-left-4 duration-700">
                                                {tab === 'run-get' && 'GET Suite.'}
                                                {tab === 'run-post' && 'POST Suite.'}
                                                {tab === 'run-put' && 'PUT Suite.'}
                                                {tab === 'run-patch' && 'PATCH Suite.'}
                                                {tab === 'run-delete' && 'DELETE Suite.'}
                                                {tab === 'run-upload' && 'Upload Suite.'}
                                            </h2>
                                            <p className="animate-in fade-in slide-in-from-left-4 duration-1000">Automated validation of {filtered.length} system endpoints.</p>
                                        </div>

                                        <div className="flex items-center gap-12">
                                            <div className={styles.suiteStats}>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statValue}>{filtered.length}</span>
                                                    <span className={styles.statLabel}>Total</span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statValue} style={{ color: '#10b981' }}>{passedCount}</span>
                                                    <span className={styles.statLabel}>Passed</span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statValue} style={{ color: '#f43f5e' }}>{failedCount}</span>
                                                    <span className={styles.statLabel}>Failed</span>
                                                </div>
                                            </div>

                                            <button 
                                                className={styles.runAllButton}
                                                onClick={() => {
                                                    const methodMap: Record<string, string> = {
                                                        'run-get': 'GET', 'run-post': 'POST', 'run-put': 'PUT', 
                                                        'run-patch': 'PATCH', 'run-delete': 'DELETE'
                                                    };
                                                    runTests(methodMap[tab]);
                                                }}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z"/></svg>
                                                )}
                                                <span>Execute Full Suite</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.tagNav}>
                                        <button 
                                            className={`${styles.tagPill} ${activeTag === 'All' ? styles.active : ''}`}
                                            onClick={() => setSelectedTag('All')}
                                        >
                                            <span>All Categories</span>
                                            <span className={styles.tagCount}>{filtered.length}</span>
                                        </button>
                                        {uniqueTags.map(tag => (
                                            <button 
                                                key={tag}
                                                className={`${styles.tagPill} ${activeTag === tag ? styles.active : ''}`}
                                                onClick={() => setSelectedTag(tag)}
                                            >
                                                <span>{tag}</span>
                                                <span className={styles.tagCount}>{tagCounts[tag]}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className={styles.suiteGrid}>
                                        {filtered.length === 0 ? (
                                            <div className="col-span-full py-32 text-center">
                                                <p className="text-dim text-lg">No endpoints detected in this category.</p>
                                            </div>
                                        ) : (
                                            Object.entries(
                                                filtered.reduce((acc, ep) => {
                                                    const tag = ep.tags?.[0] || 'General';
                                                    if (!acc[tag]) acc[tag] = [];
                                                    acc[tag].push(ep);
                                                    return acc;
                                                }, {} as Record<string, typeof filtered>)
                                            )
                                            .filter(([tag]) => activeTag === 'All' || activeTag === tag)
                                            .map(([tag, categoryEndpoints], catIdx) => (
                                                <div key={tag} className={styles.categorySection}>
                                                    <div className={styles.categoryLabel}>
                                                        <div className={styles.catLabelGroup}>
                                                            <h3>{tag}</h3>
                                                            <span className={styles.count}>{categoryEndpoints.length}</span>
                                                        </div>
                                                        <button 
                                                            className={styles.catRunButton}
                                                            disabled={loading}
                                                            onClick={() => runTests(undefined, categoryEndpoints)}
                                                        >
                                                            {loading ? (
                                                                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l10 9-10 9V3z"/></svg>
                                                            )}
                                                            Execute Category
                                                        </button>
                                                    </div>
                                                    <div className={styles.categoryGrid}>
                                                        {categoryEndpoints.map((ep, i) => {
                                                            const res = getResult(ep);
                                                            const placeholders = ep.path.match(/\{([^}]+)\}/g) || [];
                                                            const resolvePath = (path: string) => {
                                                                let resolved = path;
                                                                placeholders.forEach(p => {
                                                                    const key = p.slice(1, -1);
                                                                    const fallback = key.toLowerCase().includes('id') ? (autoParams['id'] || autoParams['uuid']) : null;
                                                                    const val = autoParams[key] || fallback;
                                                                    if (val) resolved = resolved.replace(p, val);
                                                                });
                                                                return resolved;
                                                            };

                                                            const updateAutoParams = (responseData: any) => {
                                                                const learned = extractIdentifiers(responseData);
                                                                const pathSegments = ep.path.split('/').filter(Boolean);
                                                                const lastSegment = pathSegments[pathSegments.length - 1];
                                                                if (lastSegment && !lastSegment.includes('{')) {
                                                                    const singular = lastSegment.endsWith('s') ? lastSegment.slice(0, -1) : lastSegment;
                                                                    ['id', 'uuid', '_id', 'userId'].forEach(idKey => {
                                                                        if (learned[idKey]) {
                                                                            learned[`${singular}_id`] = learned[idKey];
                                                                            learned[`${singular}Id`] = learned[idKey];
                                                                            learned[`${singular}Of`] = learned[idKey];
                                                                        }
                                                                    });
                                                                }
                                                                setAutoParams(prev => ({ ...prev, ...learned }));
                                                            };

                                                            const runEndpoint = async (singleEp: typeof ep) => {
                                                                setLoading(true);
                                                                const nextCtx = await executeStep(singleEp, autoParams);
                                                                setAutoParams(nextCtx);
                                                                setLoading(false);
                                                            };

                                                            return (
                                                                <div key={i} className={styles.endpointTile}>
                                                                    <div className={styles.tileHeader}>
                                                                        <div className={styles.tilePath}>{ep.path}</div>
                                                                        <button className={styles.tileMethod} disabled={loading} onClick={() => runEndpoint(ep)}>
                                                                            {loading ? <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z"/></svg>}
                                                                            {ep.method}
                                                                        </button>
                                                                    </div>
                                                                    {ep.summary && <p className="text-xs text-muted leading-relaxed line-clamp-2">{ep.summary}</p>}
                                                                    {['POST', 'PUT', 'PATCH'].includes(ep.method.toUpperCase()) && (
                                                                        <div className={styles.paramSection}>
                                                                            <span className={styles.paramLabel}>Request Body (Editable)</span>
                                                                            <textarea 
                                                                                className={styles.paramInput}
                                                                                style={{ marginTop: '8px', minHeight: '120px', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4', background: '#0a192f', color: '#64ffda', border: '1px solid rgba(100, 255, 218, 0.2)' }}
                                                                                value={(() => {
                                                                                    const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
                                                                                    if (manualBodies[opId] !== undefined) return manualBodies[opId];
                                                                                    try {
                                                                                        const data = JSON.parse(testData);
                                                                                        let body = data[opId]?.body || data[ep.path]?.body;
                                                                                        if (!body || Object.keys(body).length === 0) {
                                                                                            const content = ep.requestBody?.content?.["application/json"] || ep.requestBody?.content?.["multipart/form-data"];
                                                                                            if (content?.schema) body = generateFromSchema(content.schema);
                                                                                        }
                                                                                        return JSON.stringify(body || {}, null, 2);
                                                                                    } catch (e) { return "{}"; }
                                                                                })()}
                                                                                onChange={(e) => {
                                                                                    const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
                                                                                    setManualBodies(prev => ({ ...prev, [opId]: e.target.value }));
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {res && (
                                                                        <div className="animate-in fade-in duration-500">
                                                                            <div className={styles.tileInfo}>
                                                                                <div className={styles.tileTime}>{res.time.toFixed(0)} MS</div>
                                                                                <div className={`${styles.status} ${res.passed ? styles.pass : styles.fail}`}>
                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${res.passed ? 'bg-success' : 'bg-error'}`}></div>
                                                                                    {res.passed ? (res.healed ? 'AI HEALED' : 'Passed') : 'Failed'}
                                                                                </div>
                                                                            </div>
                                                                            <div className={styles.inspectorBox}>
                                                                                <pre>{JSON.stringify(res.response, null, 2)}</pre>
                                                                            </div>
                                                                            {(() => {
                                                                                const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
                                                                                const diag = aiDiagnoses[opId];
                                                                                if (!diag) return null;
                                                                                return (
                                                                                    <div className={styles.aiBox} style={{ border: diag.diagnosis === 'INPUT_ISSUE' ? '1px solid #64ffda44' : '1px solid #f43f5e44' }}>
                                                                                        <div className={styles.aiHeader}>
                                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
                                                                                            <span className={styles.aiLabel} style={{ color: diag.diagnosis === 'INPUT_ISSUE' ? '#64ffda' : '#f43f5e' }}>{diag.diagnosis === 'INPUT_ISSUE' ? 'INPUT GUIDANCE' : 'API LOGIC ISSUE'}</span>
                                                                                        </div>
                                                                                        <p className={styles.aiMessage}>{diag.explanation}</p>
                                                                                        {diag.diagnosis === 'INPUT_ISSUE' && diag.suggested_fix && (
                                                                                            <div className={styles.autoHealingStatus}>
                                                                                                <div className={styles.pulseDot}></div>
                                                                                                <span>{res.healed ? 'Auto-Fix Applied' : 'AI Auto-Healing Active...'}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            {res.error && <div className="text-[10px] text-error mt-2 font-mono">{res.error}</div>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </main>
            {/* Data Warning Toggle & Drawer */}
            <div className={`${styles.drawerBackdrop} ${warningDrawerOpen || errorDrawerOpen ? styles.active : ''}`} onClick={() => {
                setWarningDrawerOpen(false);
                setErrorDrawerOpen(false);
            }} />
            
            {/* Active Warnings Filtered */}
            {(() => {
                const visibleWarnings = results.filter(r => {
                    if (r.passed || isRealError(r)) return false;
                    const rTags = endpoints.find(e => e.path === r.endpoint && e.method === r.method)?.tags || ['General'];
                    return (selectedTag === 'All' || (selectedTag !== null && rTags.includes(selectedTag)));
                });
                const count = visibleWarnings.length;
                
                if (count === 0) return null;

                return (
                    <>
                    <button 
                        className={styles.warningToggle} 
                        onClick={() => setWarningDrawerOpen(true)}
                        style={{ bottom: failedCount > 0 ? '90px' : '32px' }}
                    >
                        <span>{count} No Data</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </button>

                    <div className={`${styles.errorDrawer} ${warningDrawerOpen ? styles.open : ''}`}>
                        <div className={styles.drawerHeader} style={{borderBottom: '1px solid rgba(245, 158, 11, 0.1)'}}>
                            <div className={styles.drawerTitle} style={{color: '#d97706'}}>Missing Data ({count})</div>
                            <button className={styles.closeButton} onClick={() => setWarningDrawerOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className={styles.drawerContent}>
                            <div className={styles.errorGrid}>
                            {(() => {
                                // Filter warnings based on the ACTIVE TAG (Page)
                                const allWarnings = results.filter(r => {
                                    if (r.passed || isRealError(r)) return false;
                                    const rTags = endpoints.find(e => e.path === r.endpoint && e.method === r.method)?.tags || ['General'];
                                    return (selectedTag === 'All' || (selectedTag !== null && rTags.includes(selectedTag)));
                                });
                                if (allWarnings.length === 0) return null;
                                
                                return allWarnings.map((fail, idx) => {
                                    const epDef = endpoints.find(e => e.path === fail.endpoint && e.method === fail.method);
                                    // Use the first tag as the category label, default to 'General'
                                    const category = epDef?.tags?.[0] || 'General'; 
                                    
                                    return (
                                        <div key={idx} className={styles.warningItem}>
                                            <div className={styles.cardHeader} style={{marginBottom: '8px'}}>
                                                <div style={{fontSize: '0.65rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing:'0.05em'}}>
                                                    {category}
                                                </div>
                                            </div>
                                            <div className={styles.cardHeader}>
                                                <div className={styles.cardPath}>{fail.endpoint}</div>
                                                <div className={styles.cardMethod}>{fail.method}</div>
                                            </div>
                                            
                                            <div className={styles.cardSummary}>
                                                {epDef?.summary || 'Endpoint Execution'}
                                            </div>

                                            <div className={styles.cardMeta}>
                                                <div className={styles.cardTime}>{Math.round(fail.time)} MS</div>
                                                <div className={`${styles.cardStatus} ${styles.warning}`}>NO DATA</div>
                                            </div>

                                            <div className={styles.cardCodeBlock}>
                                                <pre>{JSON.stringify(fail.response?.detail || fail.response || "No Data Found", null, 2)}</pre>
                                            </div>
                                        </div>
                                    );
                                });

            })()}
            </div>
            {/* End drawerContent */}
            </div>
            </div>
            </>
        );
    })()}
    {/* End Active Warnings Filtered Block */}

            {/* Error Toggle & Drawer */}
            {failedCount > 0 && (
                <>
                    <button 
                        className={styles.errorToggle} 
                        onClick={() => setErrorDrawerOpen(true)}
                    >
                        <span>{failedCount} Errors</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>

                    <div className={`${styles.errorDrawer} ${errorDrawerOpen ? styles.open : ''}`}>
                        <div className={styles.drawerHeader}>
                            <div className={styles.drawerTitle}>Failed Requests ({failedCount})</div>
                            <button className={styles.closeButton} onClick={() => setErrorDrawerOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className={styles.drawerContent}>
                            <div className={styles.errorGrid}>
                            {(() => {
                                const allFailures = results.filter(r => isRealError(r));
                                if (allFailures.length === 0) return null;

                                return allFailures.map((fail, idx) => {
                                    const epDef = endpoints.find(e => e.path === fail.endpoint && e.method === fail.method);
                                    const category = epDef?.tags?.[0] || 'General';

                                    return (
                                        <div key={idx} className={styles.errorItem}>
                                            <div className={styles.cardHeader} style={{marginBottom: '8px'}}>
                                                <div style={{fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing:'0.05em'}}>
                                                    {category}
                                                </div>
                                            </div>
                                            <div className={styles.cardHeader}>
                                                <div className={styles.cardPath}>{fail.endpoint}</div>
                                                <div className={styles.cardMethod}>{fail.method}</div>
                                            </div>
                                            
                                            <div className={styles.cardSummary}>
                                                {epDef?.summary || 'Endpoint Execution'}
                                            </div>

                                            <div className={styles.cardMeta}>
                                                <div className={styles.cardTime}>{Math.round(fail.time)} MS</div>
                                                <div className={`${styles.cardStatus} ${styles.failed}`}>FAILED</div>
                                            </div>

                                            <div className={styles.cardCodeBlock}>
                                                <pre>{JSON.stringify(fail.response?.detail || fail.response || "Unknown Error", null, 2)}</pre>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
