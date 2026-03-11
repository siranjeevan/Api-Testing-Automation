import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [tab, setTab] = useState('setup');
  const [loading, setLoading] = useState(false);
  const [endpoints, setEndpoints] = useState([]);
  const [results, setResults] = useState([]);
  const [testData, setTestData] = useState('{\n  "users": []\n}');
  const [schemas, setSchemas] = useState({});
  const [manualBodies, setManualBodies] = useState({});
  const [aiDiagnoses, setAiDiagnoses] = useState({});
  const [selectedTag, setSelectedTag] = useState(null);
  const [autoParams, setAutoParams] = useState({});
  
  const [config, setConfig] = useState({
    baseUrl: 'http://localhost:8000',
    openapiUrl: 'http://localhost:8000/openapi.json',
    environment: 'local',
    apiKey: ''
  });

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your API Copilot. Ask me anything about your endpoints or for help with testing.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Load persisted state on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('ag_config');
    if (savedConfig) {
      try { setConfig(JSON.parse(savedConfig)); } catch (e) { }
    }
    const savedTestData = localStorage.getItem('ag_test_data');
    if (savedTestData) {
      setTestData(savedTestData);
    }
    const savedSchemas = localStorage.getItem('ag_schemas');
    if (savedSchemas) {
      try { setSchemas(JSON.parse(savedSchemas)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (config.openapiUrl !== 'http://localhost:8000/openapi.json' || config.baseUrl !== 'http://localhost:8000') {
      localStorage.setItem('ag_config', JSON.stringify(config));
    }
  }, [config]);

  useEffect(() => {
    if (testData !== '{\n  "users": []\n}') {
      localStorage.setItem('ag_test_data', testData);
    }
  }, [testData]);

  // Helper functions (simplified from page.tsx)
  const extractIdentifiers = (data) => {
    const found = {};
    const scan = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(scan);
        return;
      }
      Object.entries(obj).forEach(([key, val]) => {
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

  const generateFromSchema = (schema, depth = 0, fieldName = '', overrideSchemas = null) => {
    const currentSchemas = overrideSchemas || schemas;
    if (!schema || depth > 5) return {};
    if (schema.$ref) {
      const parts = schema.$ref.split('/');
      const name = parts[parts.length - 1];
      const resolved = currentSchemas[name];
      if (resolved) return generateFromSchema(resolved, depth + 1, fieldName, currentSchemas);
      return `<REF:${name}>`;
    }
    const lowerName = (fieldName || "").toLowerCase();
    const specificKey = Object.keys(autoParams).find(k => k === fieldName || k === lowerName || (k.toLowerCase() === lowerName));
    if (specificKey) return `{{${specificKey}}}`;
    if (lowerName.includes('id') || lowerName.endsWith('_id') || lowerName.endsWith('id')) {
      return `{{${fieldName}}}`;
    }
    if (schema.example) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.properties) {
      const obj = {};
      for (const key in schema.properties) {
        obj[key] = generateFromSchema(schema.properties[key], depth + 1, key, currentSchemas);
      }
      return obj;
    }
    if (schema.items) return [generateFromSchema(schema.items, depth + 1, fieldName, currentSchemas)];
    const type = schema.type?.toLowerCase();
    if (type === "string") return schema.enum ? schema.enum[0] : "string";
    if (type === "integer" || type === "number") return 0;
    if (type === "boolean") return true;
    return {};
  };

  const parseSwagger = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.openapiUrl })
      });
      const data = await res.json();
      if (data.endpoints) {
        setEndpoints(data.endpoints);
        const newSchemas = data.raw?.components?.schemas || data.raw?.definitions || {};
        setSchemas(newSchemas);
        
        // Generate initial test data templates locally
        const initialData = {};
        data.endpoints.forEach(ep => {
          const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
          let bodySchema = null;
          if (ep.requestBody?.content?.['application/json']?.schema) {
            bodySchema = ep.requestBody.content['application/json'].schema;
          }
          
          initialData[opId] = {
            body: bodySchema ? generateFromSchema(bodySchema, 0, '', newSchemas) : {},
            parameters: {}
          };
        });
        setTestData(JSON.stringify(initialData, null, 2));
        setTab('run-get');
      }
    } catch (e) {
      alert("Error parsing Swagger");
    } finally {
      setLoading(false);
    }
  };

  const generateAITestData = async () => {
    if (!config.apiKey) {
      alert("Please enter an AI Intelligence Key first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/generate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, endpoints })
      });
      const data = await res.json();
      if (data.testData) {
        setTestData(JSON.stringify(data.testData, null, 2));
      }
    } catch (e) {
      alert("Error generating AI test data");
    } finally {
      setLoading(false);
    }
  };

  const executeStep = async (ep, passedContext, retryCount = 0, forcedBody = null) => {
    let currentContext = { ...passedContext };
    const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
    
    let bodyToAnalyze = forcedBody || {};
    if (!forcedBody) {
        if (manualBodies[opId]) {
            try { bodyToAnalyze = JSON.parse(manualBodies[opId]); } catch (e) {}
        } else {
            try {
                const globalData = JSON.parse(testData);
                bodyToAnalyze = globalData[opId]?.body || bodyToAnalyze;
            } catch (e) {}
        }
    }

    // Path resolution logic here... (omitted for brevity in this initial write, will add full logic in next step)
    // For now, simple fetch
    try {
        const runRes = await fetch('http://localhost:8000/run-step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl: config.baseUrl,
                endpoint: ep,
                variables: { 
                    ...currentContext, 
                    headers: { 
                        ...currentContext.headers, 
                        ...(config.apiKey ? { 'X-API-KEY': config.apiKey, 'Authorization': `Bearer ${config.apiKey}` } : {})
                    } 
                },
                testData: { [opId]: { body: bodyToAnalyze } }
            })
        });
        const runData = await runRes.json();
        const resultItem = runData.results?.[0];
        
        if (resultItem) {
            // Update results first
            setResults(prev => [...prev.filter(r => !(r.endpoint === ep.path && r.method === ep.method)), resultItem]);
            
            // AUTONOMOUS HEALING: If failed and we haven't retried yet
            if (!resultItem.passed && retryCount === 0 && config.apiKey) {
                console.log(`Autonomous Healing triggered for ${ep.path}...`);
                setAiDiagnoses(prev => ({ ...prev, [opId]: { loading: true, autonomous: true } }));
                
                try {
                    const diagRes = await fetch('http://localhost:8000/diagnose', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: config.apiKey,
                            endpoint: ep,
                            requestBody: resultItem.request_body,
                            responseBody: resultItem.response
                        })
                    });
                    const diagData = await diagRes.json();
                    setAiDiagnoses(prev => ({ ...prev, [opId]: { ...diagData, loading: false, autonomous: true } }));

                    if (diagData.diagnosis === 'INPUT_ISSUE' && diagData.suggested_fix) {
                        console.log(`Applying AI correction to ${ep.path}...`);
                        // RETRY with higher retryCount to prevent loops
                        return await executeStep(ep, currentContext, retryCount + 1, diagData.suggested_fix);
                    }
                } catch (diagError) {
                    console.error("Auto-healing failed:", diagError);
                    setAiDiagnoses(prev => ({ ...prev, [opId]: { error: "Heal failed", loading: false } }));
                }
            }

            if (resultItem.passed && resultItem.response) {
                const learned = extractIdentifiers(resultItem.response);
                return { ...currentContext, ...learned };
            }
        }
    } catch (e) {
        console.error("Execution error:", e);
    }
    return currentContext;
  };

  const runTests = async (methodFilter, overrideEndpoints) => {
    setLoading(true);
    const target = overrideEndpoints || (methodFilter ? endpoints.filter(e => e.method.toUpperCase() === methodFilter) : endpoints);
    let ctx = { ...autoParams };
    for (const ep of target) {
      ctx = await executeStep(ep, ctx);
    }
    setAutoParams(ctx);
    setLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, apiKey: config.apiKey })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, I couldn't process that." }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with the backend." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const diagnoseFailedCall = async (ep, result) => {
    if (!config.apiKey) {
      alert("Intelligence Key required for AI Diagnosis");
      return;
    }
    
    const opId = ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`;
    setAiDiagnoses(prev => ({ ...prev, [opId]: { loading: true } }));
    
    try {
      const res = await fetch('http://localhost:8000/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          endpoint: ep,
          requestBody: result.request_body,
          responseBody: result.response
        })
      });
      const data = await res.json();
      setAiDiagnoses(prev => ({ ...prev, [opId]: { ...data, loading: false } }));
    } catch (e) {
      setAiDiagnoses(prev => ({ ...prev, [opId]: { error: "Diagnosis failed", loading: false } }));
    }
  };

  const getResult = (ep) => results.find(r => r.endpoint === ep.path && r.method === ep.method);
  const getDiagnosis = (ep) => aiDiagnoses[ep.operationId || `${ep.method.toUpperCase()}_${ep.path}`];

  // Layout components following Glassmorphism and Tailwind
  return (
    <div className="flex min-h-screen bg-soft-gray text-cocoa font-sans selection:bg-cocoa/10">
      {/* Sidebar */}
      <aside className={`${sidebarExpanded ? 'w-72' : 'w-20'} bg-cocoa border-r border-soft-gray/10 flex flex-col transition-all duration-300 z-50 shrink-0 shadow-2xl`}>
        <div className="p-6 flex items-center gap-3">
          <div className={`w-10 h-10 bg-soft-gray/10 border border-soft-gray/20 rounded-xl flex items-center justify-center text-soft-gray shadow-lg shrink-0 ${!sidebarExpanded ? 'mx-auto' : ''}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          {sidebarExpanded && <h1 className="text-xl font-bold tracking-tight text-soft-gray animate-in fade-in slide-in-from-left-2 duration-300">AG Automation</h1>}
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            isActive={tab === 'setup'} 
            onClick={() => setTab('setup')} 
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>}
            label="Configuration"
            expanded={sidebarExpanded}
          />
          {endpoints.length > 0 && (
            <>
              {sidebarExpanded ? (
                <div className="mt-8 mb-4 px-2 text-[10px] uppercase tracking-[0.2em] text-soft-gray/40 font-bold animate-in fade-in duration-500">Suites</div>
              ) : (
                <div className="h-px bg-soft-gray/10 my-6 mx-2" />
              )}
              
              {[...new Set(endpoints.map(e => e.method.toUpperCase()))].sort((a, b) => {
                const order = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
                const idxA = order.indexOf(a);
                const idxB = order.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
              }).map(method => {
                const iconMap = {
                  'GET': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
                  'POST': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>,
                  'PUT': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
                  'PATCH': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
                  'DELETE': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>
                };
                return (
                  <NavItem 
                    key={method}
                    isActive={tab === `run-${method.toLowerCase()}`} 
                    onClick={() => {setTab(`run-${method.toLowerCase()}`); setSelectedTag(null);}} 
                    icon={iconMap[method] || <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>} 
                    label={`${method} Suite`} 
                    expanded={sidebarExpanded} 
                  />
                );
              })}
            </>
          )}
        </nav>

        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="p-6 text-soft-gray hover:text-white transition-all flex justify-center border-t border-soft-gray/20 bg-soft-gray/5 group shrink-0 relative z-[60]"
          title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <div className="transition-transform duration-500" style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </div>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden bg-soft-gray relative">
        {tab === 'setup' && (
          <div className="h-full flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cocoa/5 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cocoa/5 rounded-full blur-[100px]"></div>
            
            <div className="max-w-4xl w-full bg-white/40 backdrop-blur-3xl border border-cocoa/10 rounded-[32px] overflow-hidden shadow-2xl shadow-cocoa/5 flex relative z-10">
              <div className="w-1/3 p-12 bg-cocoa/[0.02] border-r border-cocoa/10 flex flex-col justify-between">
                <div>
                  <h2 className="text-4xl font-black mb-6 leading-tight text-cocoa uppercase tracking-tighter">Mission<br />Control.</h2>
                  <p className="text-cocoa/60 leading-relaxed text-sm">Establish a secure connection to your API infrastructure. Configure your testing environment and authorized credentials to begin automated analysis.</p>
                </div>
              </div>
              
              <div className="flex-1 p-12 space-y-8">
                <InputGroup 
                  label="01 // Blueprint Source" 
                  value={config.openapiUrl} 
                  onChange={v => setConfig({...config, openapiUrl: v})}
                  placeholder="http://127.0.0.1:8001/openapi.json"
                  badge="REQUIRED"
                />
                <InputGroup 
                  label="02 // Environment Target" 
                  value={config.baseUrl} 
                  onChange={v => setConfig({...config, baseUrl: v})}
                  placeholder="http://127.0.0.1:8001"
                  badge="REQUIRED"
                />
                <InputGroup 
                  label="03 // Intelligence Key" 
                  value={config.apiKey} 
                  onChange={v => setConfig({...config, apiKey: v})}
                  placeholder="gsk_..."
                  type="password"
                  badge="SECURE"
                />
                <button 
                  onClick={parseSwagger}
                  disabled={loading}
                  className="w-full py-5 bg-cocoa text-soft-gray font-black tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-cocoa/20 disabled:opacity-50 uppercase flex items-center justify-center gap-3"
                >
                  {loading ? 'Connecting...' : 'Initialize System'}
                  <svg width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {tab.startsWith('run-') && (
           <div className="h-full relative overflow-hidden">
             {!config.apiKey && (
               <div className="absolute inset-0 z-[100] bg-soft-gray/60 backdrop-blur-2xl flex items-center justify-center p-12">
                 <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-rose-500/20">
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgb(244 63 94)" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h2 className="text-4xl font-black text-cocoa uppercase tracking-tight">Intelligence Key Required</h2>
                    <p className="text-cocoa/50 leading-relaxed text-sm">
                      Access to automated suites and AI-assisted healing protocols is restricted. 
                      Please provide your authorized Intelligence Key in <span className="font-bold text-cocoa">Mission Control</span> to unlock these capabilities.
                    </p>
                    <button 
                      onClick={() => setTab('setup')}
                      className="px-10 py-4 bg-cocoa text-soft-gray rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-cocoa/20"
                    >
                      Return to Mission Control
                    </button>
                 </div>
               </div>
             )}
             <div className="h-full p-12 overflow-y-auto">
             {/* Category Pills Header */}
             <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={() => setSelectedTag(null)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${selectedTag === null ? 'bg-cocoa text-soft-gray border-cocoa' : 'bg-white/40 text-cocoa border-cocoa/10 hover:border-cocoa/30'}`}
                >
                  All Endpoints <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedTag === null ? 'bg-soft-gray/20' : 'bg-cocoa/10 font-black'}`}>{endpoints.filter(e => tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()).length}</span>
                </button>
                {[...new Set(endpoints.filter(e => tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()).flatMap(e => e.tags || ['General']))].map(tag => {
                  const count = endpoints.filter(e => (tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()) && (e.tags || ['General']).includes(tag)).length;
                  return (
                    <button 
                      key={tag}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${selectedTag === tag ? 'bg-cocoa text-soft-gray border-cocoa shadow-lg' : 'bg-white/40 text-cocoa border-cocoa/10 hover:border-cocoa/30'}`}
                    >
                      {tag} <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedTag === tag ? 'bg-soft-gray/20' : 'bg-cocoa/10 font-black'}`}>{count}</span>
                    </button>
                  );
                })}
             </div>

             <div className="flex justify-between items-end mb-12">
               <div>
                  <h2 className="text-6xl font-black mb-4 tracking-tighter uppercase text-cocoa">
                    {selectedTag ? selectedTag : (tab === 'run-all' ? 'Discovery' : `${tab.replace('run-', '')} Suite`)}
                  </h2>
                  <p className="text-cocoa/40 text-lg font-medium">
                    {selectedTag ? `Endpoints belonging to the ${selectedTag} category.` : (tab === 'run-all' ? 'Full system reconnaissance and endpoint mapping.' : 'Automated validation of detected system endpoints.')}
                  </p>
               </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const visibleEndpoints = endpoints.filter(e => 
                        (tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()) && 
                        (!selectedTag || (e.tags || ['General']).includes(selectedTag))
                      );
                      const visiblePaths = visibleEndpoints.map(e => e.path);
                      const visibleMethods = visibleEndpoints.map(e => e.method);
                      const visibleOpIds = visibleEndpoints.map(e => e.operationId || `${e.method.toUpperCase()}_${e.path}`);
                      
                      setResults(prev => prev.filter(r => !visiblePaths.includes(r.endpoint) || !visibleMethods.includes(r.method)));
                      setAiDiagnoses(prev => {
                        const next = { ...prev };
                        visibleOpIds.forEach(id => delete next[id]);
                        return next;
                      });
                    }}
                    className="px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all border bg-white/40 text-rose-500 border-rose-500/10 hover:border-rose-500/30"
                    title="Clear results for this view"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                    Clean
                  </button>
                  <button 
                    onClick={() => {
                      const filtered = endpoints.filter(e => 
                        (tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()) && 
                        (!selectedTag || (e.tags || ['General']).includes(selectedTag))
                      );
                      runTests(null, filtered);
                    }}
                    className="px-8 py-4 bg-cocoa text-soft-gray hover:bg-cocoa/90 border border-cocoa/10 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-cocoa/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z" /></svg>
                    Execute {selectedTag ? 'Group' : 'Full Suite'}
                  </button>
                </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {endpoints
                  .filter(e => 
                    (tab === 'run-all' || e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()) && 
                    (!selectedTag || (e.tags || ['General']).includes(selectedTag))
                  )
                  .map((ep, i) => (
                    <EndpointCard 
                      key={i} 
                      ep={ep} 
                      result={getResult(ep)} 
                      diagnosis={getDiagnosis(ep)}
                      onRun={(forcedBody) => executeStep(ep, autoParams, 0, forcedBody)} 
                      onDiagnose={() => diagnoseFailedCall(ep, getResult(ep))}
                    />
                  ))
                }
             </div>
           </div>
            </div>
          </div>
        )}

// REMOVED LEGACY CATEGORY TAB
      </main>
    </div>
  );
}

function NavItem({ isActive, onClick, icon, label, expanded }) {
  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${isActive ? 'bg-soft-gray text-cocoa shadow-xl ring-1 ring-white/10' : 'text-soft-gray hover:bg-white/5 hover:text-white'}`}
      title={!expanded ? label : undefined}
    >
      <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${!expanded ? 'mx-auto' : 'mr-4'}`}>
        {icon}
      </div>
      
      {expanded && (
        <span className="font-bold tracking-wide text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}

      {/* Mini indicator for collapsed state */}
      {!expanded && isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-cocoa rounded-l-full shadow-lg" />
      )}
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, badge, type = "text" }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-gray">{label}</label>
        {badge && <span className="text-[9px] font-black px-2 py-1 bg-teal-accent/10 text-teal-accent border border-teal-accent/20 rounded-md tracking-widest">{badge}</span>}
      </div>
      <input 
        type={type} 
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-cocoa/10 rounded-2xl p-5 text-cocoa placeholder:text-cocoa/20 focus:outline-none focus:border-cocoa/50 focus:ring-4 focus:ring-cocoa/5 transition-all font-mono text-sm shadow-sm"
      />
    </div>
  );
}

function EndpointCard({ ep, result, diagnosis, onRun, onDiagnose }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`bg-white/60 backdrop-blur-xl border rounded-[24px] overflow-hidden hover:border-cocoa/20 transition-all group shadow-sm ${result && !result.passed ? 'border-rose-500/20 shadow-rose-500/5' : 'border-cocoa/10'}`}>
      <div className="p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${ep.method === 'GET' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-cocoa text-soft-gray'}`}>
            {ep.method}
          </div>
          <div className="truncate flex-1">
            <h3 className="font-mono text-sm text-cocoa truncate font-bold">{ep.path}</h3>
            <p className="text-xs text-cocoa/40 mt-1">{ep.summary || 'No description available'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {result && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${result.passed ? 'bg-cocoa text-soft-gray' : 'bg-rose-500/10 text-rose-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${result.passed ? 'bg-soft-gray animate-pulse' : 'bg-rose-500'}`}></div>
              {result.passed ? 'Passed' : 'Failed'}
            </div>
          )}
          
          {!result?.passed && result && !diagnosis && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDiagnose(); }}
              className="px-3 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-rose-600 transition-all flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>
              AI Heal
            </button>
          )}

          <button 
            onClick={() => onRun()}
            className="w-10 h-10 bg-cocoa/5 hover:bg-cocoa hover:text-soft-gray rounded-xl flex items-center justify-center transition-all active:scale-90 text-cocoa"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z" /></svg>
          </button>
          <button 
            onClick={() => setExpanded(!expanded)}
            className={`w-10 h-10 text-cocoa/20 hover:text-cocoa transition-all transform ${expanded ? 'rotate-180' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-cocoa/5 p-6 bg-white/40 space-y-6">
          {/* Analysis Section */}
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-cocoa/30 mb-2">Analysis Path // Targeted URL</div>
            <div className="text-xs font-mono text-cocoa/60 break-all bg-cocoa/5 p-3 rounded-xl border border-cocoa/5">{result?.url || 'Not executed yet'}</div>
          </div>

          {/* AI Diagnosis Result */}
          {diagnosis && (
            <div className={`p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 border ${diagnosis.autonomous ? 'bg-cocoa text-soft-gray border-white/20' : 'bg-white/80 text-cocoa border-rose-500/10'}`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">AI Intelligence Diagnosis</div>
                      {diagnosis.autonomous && (
                        <span className="px-2 py-0.5 bg-amber-400 text-cocoa text-[9px] font-black rounded uppercase tracking-wider">Autonomous Recovery</span>
                      )}
                    </div>
                    <div className="font-bold flex items-center gap-2 text-sm">
                      {diagnosis.loading ? (
                        <div className="flex items-center gap-2 text-amber-400">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
                          {diagnosis.autonomous ? 'AUTONOMOUS RECOVERY IN PROGRESS...' : 'In-flight Investigation...'}
                        </div>
                      ) : (
                        <>
                          <div className={`w-2 h-2 rounded-full ${diagnosis.diagnosis === 'INPUT_ISSUE' ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                          {diagnosis.diagnosis === 'INPUT_ISSUE' ? (diagnosis.autonomous ? 'Recovery Protocol Active' : 'Logic Refinement Needed') : 'Infrastructure Failure Detected'}
                        </>
                      )}
                    </div>
                  </div>
               </div>
               
               {!diagnosis.loading && (
                 <>
                  <p className="text-sm leading-relaxed mb-6 opacity-80">
                    {diagnosis.autonomous ? `The system detected a logic mismatch and has autonomously corrected the payload. ${diagnosis.explanation}` : diagnosis.explanation}
                  </p>
                  
                  {diagnosis.suggested_fix && !diagnosis.autonomous && (
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Intelligence Solution // AI Generated Payload</div>
                        <pre className="bg-black/20 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[150px] border border-white/5">
                          {JSON.stringify(diagnosis.suggested_fix, null, 2)}
                        </pre>
                        <button 
                          onClick={() => onRun(diagnosis.suggested_fix)}
                          className="w-full py-3 bg-soft-gray text-cocoa rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z" /></svg>
                          Apply AI Fix & Retry Suite
                        </button>
                    </div>
                  )}
                 </>
               )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Section */}
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-cocoa/30 mb-2">Request Body // JSON Fragment</div>
              <pre className="text-[11px] font-mono text-cocoa/80 bg-cocoa/5 p-4 rounded-xl border border-cocoa/5 h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-cocoa/10 scrollbar-track-transparent">
                {result?.request_body ? JSON.stringify(result.request_body, null, 2) : "// No Payload"}
              </pre>
            </div>

            {/* Response Section */}
            <div>
              <div className={`text-[10px] uppercase font-black tracking-widest mb-2 ${result?.error ? 'text-rose-500/50' : 'text-cocoa/30'}`}>
                {result?.error ? 'Error Detail // Traceback' : 'Response Payload // Server Output'}
              </div>
              <pre className={`text-[11px] font-mono leading-relaxed p-4 rounded-xl border h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-cocoa/10 scrollbar-track-transparent ${result?.error ? 'text-rose-600 bg-rose-500/5 border-rose-500/10' : 'text-cocoa/80 bg-soft-gray/5 border-cocoa/5'}`}>
                {result?.error ? result.error : (result?.response ? (typeof result.response === 'object' ? JSON.stringify(result.response, null, 2) : result.response) : '// Waiting for execution...')}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
