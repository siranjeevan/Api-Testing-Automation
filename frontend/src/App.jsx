import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
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

  const generateFromSchema = (schema, depth = 0, fieldName = '') => {
    if (!schema || depth > 5) return {};
    if (schema.$ref) {
      const parts = schema.$ref.split('/');
      const name = parts[parts.length - 1];
      const resolved = schemas[name];
      if (resolved) return generateFromSchema(resolved, depth + 1, fieldName);
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
        obj[key] = generateFromSchema(schema.properties[key], depth + 1, key);
      }
      return obj;
    }
    if (schema.items) return [generateFromSchema(schema.items, depth + 1, fieldName)];
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
        setSchemas(data.raw?.components?.schemas || data.raw?.definitions || {});
        setTab('run-get');
      }
    } catch (e) {
      alert("Error parsing Swagger");
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
                variables: currentContext,
                testData: { [opId]: { body: bodyToAnalyze } }
            })
        });
        const runData = await runRes.json();
        const resultItem = runData.results?.[0];
        if (resultItem) {
            setResults(prev => [...prev.filter(r => !(r.endpoint === ep.path && r.method === ep.method)), resultItem]);
            if (resultItem.passed && resultItem.response) {
                const learned = extractIdentifiers(resultItem.response);
                return { ...currentContext, ...learned };
            }
        }
    } catch (e) {}
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

  const getResult = (ep) => results.find(r => r.endpoint === ep.path && r.method === ep.method);

  // Layout components following Glassmorphism and Tailwind
  return (
    <div className="flex min-h-screen bg-soft-gray text-cocoa font-sans selection:bg-cocoa/10">
      {/* Sidebar */}
      <aside className={`${sidebarExpanded ? 'w-72' : 'w-20'} bg-cocoa border-r border-soft-gray/10 flex flex-col transition-all duration-300 z-50 shrink-0 shadow-2xl`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-soft-gray/10 border border-soft-gray/20 rounded-xl flex items-center justify-center text-soft-gray shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          {sidebarExpanded && <h1 className="text-xl font-bold tracking-tight text-soft-gray">AG Automation</h1>}
        </div>
        
        <nav className="flex-1 px-4">
          <NavItem 
            isActive={tab === 'setup'} 
            onClick={() => setTab('setup')} 
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>}
            label="Configuration"
            expanded={sidebarExpanded}
          />
          {endpoints.length > 0 && (
            <>
              <div className="mt-8 mb-4 px-2 text-[10px] uppercase tracking-[0.2em] text-soft-gray font-bold">Suites</div>
              <NavItem isActive={tab === 'run-get'} onClick={() => setTab('run-get')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>} label="GET Suite" expanded={sidebarExpanded} />
              <NavItem isActive={tab === 'run-post'} onClick={() => setTab('run-post')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>} label="POST Suite" expanded={sidebarExpanded} />
            </>
          )}
        </nav>

        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="p-6 text-soft-gray/50 hover:text-white transition-colors flex justify-center"
        >
          <svg width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}><polyline points="15 18 9 12 15 6" /></svg>
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
           <div className="h-full p-12 overflow-y-auto">
             <div className="flex justify-between items-end mb-12">
                <div>
                  <h2 className="text-6xl font-black mb-4 tracking-tighter uppercase text-cocoa">{tab.replace('run-', '')} Suite.</h2>
                  <p className="text-cocoa/40 text-lg font-medium">Automated validation of detected system endpoints.</p>
               </div>
               <button 
                onClick={() => runTests(tab.replace('run-', '').toUpperCase())}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center gap-3 transition-all"
               >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z" /></svg>
                 Execute Full Suite
               </button>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {endpoints.filter(e => e.method.toUpperCase() === tab.replace('run-', '').toUpperCase()).map((ep, i) => (
                  <EndpointCard key={i} ep={ep} result={getResult(ep)} onRun={() => executeStep(ep, autoParams)} />
                ))}
             </div>
           </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ isActive, onClick, icon, label, expanded }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${isActive ? 'bg-soft-gray text-cocoa shadow-lg' : 'text-soft-gray hover:bg-white/5 hover:text-white'}`}
    >
      <div className={`shrink-0 transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      {expanded && <span className="font-bold tracking-wide text-sm">{label}</span>}
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

function EndpointCard({ ep, result, onRun }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-cocoa/10 rounded-[24px] overflow-hidden hover:border-cocoa/20 transition-all group shadow-sm">
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
          <button 
            onClick={onRun}
            className="w-10 h-10 bg-cocoa/5 hover:bg-cocoa hover:text-soft-gray rounded-xl flex items-center justify-center transition-all active:scale-90 text-cocoa"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 3l14 9-14 9V3z" /></svg>
          </button>
          <button 
            onClick={() => setExpanded(!expanded)}
            className={`w-10 h-10 text-cocoa/20 hover:text-cocoa transition-all transform ${expanded ? 'rotate-180' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>
      
      {expanded && result && (
        <div className="border-t border-white/5 p-6 bg-black/20">
          <pre className="text-[11px] font-mono text-cocoa/80 leading-relaxed overflow-x-auto">
            {JSON.stringify(result.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
