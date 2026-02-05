"use client";
import React, { useState } from 'react';
import styles from './page.module.css';
import { ApiEndpoint, TestExecutionResult } from './types';

export default function Home() {

    const [config, setConfig] = useState({
        baseUrl: 'http://localhost:8000', // Default example
        openapiUrl: 'http://localhost:8000/openapi.json',
        environment: 'local',
        apiKey: ''
    });
    const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
    const [testData, setTestData] = useState('{\n  "users": []\n}');
    const [results, setResults] = useState<TestExecutionResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('setup');

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

                // Auto-detect and set Base URL from server definition or origin
                let detectedUrl = '';
                if (data.raw?.servers?.length > 0) {
                    detectedUrl = data.raw.servers[0].url;
                }

                // If server URL is relative or missing, derive from OpenAPI URL
                if (!detectedUrl || !detectedUrl.startsWith('http')) {
                    try {
                        const urlObj = new URL(config.openapiUrl);
                        detectedUrl = urlObj.origin;
                    } catch (e) { }
                }

                if (detectedUrl) {
                    setConfig(prev => ({ ...prev, baseUrl: detectedUrl }));
                }

                setTab('data');
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error: ${e.message || 'Failed to parse Swagger'}`);
        } finally {
            setLoading(false);
        }
    };

    const runTests = async () => {
        if (!config.baseUrl) {
            alert("Please set a Target Base URL in the Setup tab.");
            setTab('setup');
            return;
        }
        setTab('run');
        setLoading(true);
        setResults([]);
        try {
            const res = await fetch('http://localhost:8000/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseUrl: config.baseUrl,
                    endpoints: endpoints,
                    testData: JSON.parse(testData),
                    variables: {}
                })
            });
            const data = await res.json();
            setResults(data.results);
        } catch (e) {
            alert('Error running tests');
        } finally {
            setLoading(false);
        }
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

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>AG Testing</div>
                <nav>
                    <div className={`${styles.navItem} ${tab === 'setup' ? styles.active : ''}`} onClick={() => setTab('setup')}>Setup</div>
                    <div className={`${styles.navItem} ${tab === 'data' ? styles.active : ''}`} onClick={() => setTab('data')}>Test Data</div>
                    <div className={`${styles.navItem} ${tab === 'run' ? styles.active : ''}`} onClick={() => setTab('run')}>Runner</div>
                </nav>
            </aside>
            <main className={styles.main}>
                {tab === 'setup' && (
                    <div className={styles.card}>
                        <h2 className="text-xl font-bold mb-4">Configuration</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>OpenAPI / Swagger URL</label>
                            <input
                                className={styles.input}
                                value={config.openapiUrl}
                                onChange={e => setConfig({ ...config, openapiUrl: e.target.value })}
                                placeholder="https://api.example.com/openapi.json"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Target Base URL</label>
                            <input
                                className={styles.input}
                                value={config.baseUrl}
                                onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                placeholder="https://api.example.com"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>AI API Key (Groq)</label>
                            <input
                                className={styles.input}
                                value={config.apiKey}
                                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                placeholder="gsk_..."
                                type="password"
                            />
                        </div>
                        <button className={styles.button} onClick={parseSwagger} disabled={loading}>
                            {loading ? 'Parsing...' : 'Load Definition'}
                        </button>
                    </div>
                )}

                {tab === 'data' && (
                    <div className="h-full flex flex-col" style={{ height: '100%' }}>
                        <div className={styles.header}>
                            <h2 className="text-xl font-bold">Test Data (JSON)</h2>
                            <div className="flex gap-2">
                                <button className={`${styles.button} ${styles.secondary}`} onClick={generateData} disabled={loading}>
                                    {loading ? 'Generating...' : '✨ AI Generate Data'}
                                </button>
                                <button className={styles.button} onClick={() => setTab('run')}>Next: Run Tests</button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Enter data keyed by operationId or path.</p>
                        <textarea
                            className={`${styles.input} flex-1 font-mono`}
                            value={testData}
                            onChange={e => setTestData(e.target.value)}
                            style={{ minHeight: '400px', backgroundColor: '#1e293b', color: '#f8fafc' }}
                        />
                    </div>
                )}

                {tab === 'run' && (
                    <div>
                        <div className={styles.header}>
                            <h2 className="text-xl font-bold">Execution</h2>
                            <button className={styles.button} onClick={runTests} disabled={loading}>
                                {loading ? 'Running...' : 'Run All Tests'}
                            </button>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.card} style={{ gridColumn: 'span 2' }}>
                                <h3>Endpoints ({endpoints.length})</h3>
                                <div className="mt-4">
                                    {endpoints.map((ep, i) => {
                                        const res = getResult(ep);
                                        return (
                                            <div key={i} className={styles.endpointCard}>
                                                <div className="flex items-center">
                                                    <span className={`${styles.method} ${styles[ep.method.toLowerCase()]}`}>{ep.method}</span>
                                                    <span className="text-sm font-mono text-gray-300">{ep.path}</span>
                                                </div>
                                                {res ? (
                                                    <div className="flex flex-col gap-2 items-end w-full">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-gray-500">{res.time.toFixed(0)}ms</span>
                                                            <span className={`${styles.status} ${res.passed ? styles.pass : styles.fail}`}>
                                                                {res.passed ? 'PASSED' : 'FAILED'} ({res.status})
                                                            </span>
                                                        </div>
                                                        <details className="w-full mt-2">
                                                            <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-white select-none mb-2 flex items-center gap-2">
                                                                <span>View Response</span>
                                                                <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300">
                                                                    {typeof res.response === 'string' ? res.response.length + ' chars' : 'JSON Object'}
                                                                </span>
                                                            </summary>
                                                            <div className={`p-3 text-xs font-mono rounded w-full overflow-auto border ${res.passed ? 'bg-slate-900 border-slate-700 text-green-300' : 'bg-red-950/30 border-red-900/50 text-red-200'}`} style={{ maxHeight: '500px' }}>
                                                                <pre className="whitespace-pre-wrap break-all">
                                                                    {(() => {
                                                                        try {
                                                                            // Try to parse string as JSON to pretty-print it
                                                                            const val = typeof res.response === 'string' ? JSON.parse(res.response) : res.response;
                                                                            return JSON.stringify(val, null, 2);
                                                                        } catch {
                                                                            return res.response;
                                                                        }
                                                                    })()}
                                                                </pre>
                                                                {res.error && <div className="text-red-400 mt-2 pt-2 border-t border-red-900/50 font-bold">Error: {res.error}</div>}
                                                            </div>
                                                        </details>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-600">Pending</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
