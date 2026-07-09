import { useState, useEffect } from 'react';
import './App.css';

// Import Modularized Views
import Home from './views/Home';
import CustomerDashboard from './views/CustomerDashboard';
import AdminPanel from './views/AdminPanel';

const ADMIN_ROLES = ['admin', 'master_admin'];
const ROUTE_ALIASES = {
  '/': 'home',
  '/customer-dashboard': 'customer',
  '/admin-panel': 'admin'
};

export default function App() {
  const [page, setPage] = useState('home');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Authentication Input States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regForm, setRegForm] = useState({ first_name: '', last_name: '', email: '', password: '', age: 25, monthly_income: 50000 });

  // Calculator Input/Output States
  const [calcData, setCalcData] = useState({ scheme_id: '', income: 60000, amount: 500000, tenure: 60 });
  const [calcResult, setCalcResult] = useState(null);

  // Customer Application States
  const [appForm, setAppForm] = useState({ scheme_id: '', amount: 200000, tenure: 36 });
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [salaryFile, setSalaryFile] = useState(null);
  const [portfolio, setPortfolio] = useState({ active: [], applications: [] });

  // Admin Workspace States
  const [adminQueue, setAdminQueue] = useState([]);
  const [metrics, setMetrics] = useState({ totalDisbursed: 0, totalExposure: 0, activeLoans: 0, conversionRate: "0.0" });

  const navigateTo = (targetPage) => {
    const resolvedPage = ROUTE_ALIASES[targetPage] || targetPage;
    setLoading(true);
    setTimeout(() => {
      setPage(resolvedPage);
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/schemes')
      .then(res => {
        if (!res.ok) throw new Error("Server delivered invalid status code");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSchemes(data);
          setCalcData(prev => ({ ...prev, scheme_id: data[0].scheme_id || data[0].SCHEME_ID }));
          setAppForm(prev => ({ ...prev, scheme_id: data[0].scheme_id || data[0].SCHEME_ID }));
        } else {
          throw new Error("Empty array returned from server");
        }
      })
      .catch(err => {
        console.warn("Bypassing server connection wall. Seeding UI with fallbacks:", err);
        const fallbackSchemes = [
          { scheme_id: 1, scheme_name: 'Standard Education Loan', interest_rate: 8.50, min_income_required: 25000.00, max_tenure_months: 120 },
          { scheme_id: 2, scheme_name: 'Standard Home Loan', interest_rate: 7.75, min_income_required: 35000.00, max_tenure_months: 360 },
          { scheme_id: 3, scheme_name: 'Standard Vehicle Loan', interest_rate: 9.25, min_income_required: 30000.00, max_tenure_months: 84 },
          { scheme_id: 4, scheme_name: 'Standard Personal Loan', interest_rate: 10.50, min_income_required: 40000.00, max_tenure_months: 60 }
        ];
        setSchemes(fallbackSchemes);
        setCalcData(prev => ({ ...prev, scheme_id: fallbackSchemes[0].scheme_id }));
        setAppForm(prev => ({ ...prev, scheme_id: fallbackSchemes[0].scheme_id }));
      });
  }, []);


  const handleLogin = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPass })
    });
    const data = await res.json();
    setLoading(false);
    
    if (data.success) {
      const authenticatedRole = data.user?.role || data.profile?.role || data.account?.role || data.role;
      if (!['customer', ...ADMIN_ROLES].includes(authenticatedRole)) {
        alert('Invalid role');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', authenticatedRole);
      setToken(data.token);
      setRole(authenticatedRole);
      if (authenticatedRole === 'customer') {
        navigateTo('/customer-dashboard');
      } else if (ADMIN_ROLES.includes(authenticatedRole)) {
        navigateTo('/admin-panel');
      }

      if (ADMIN_ROLES.includes(authenticatedRole)) {
        const queueRes = await fetch('http://localhost:5000/api/admin/queue', { headers: { 'Authorization': data.token } });
        const queueData = await queueRes.json();
        setAdminQueue(Array.isArray(queueData) ? queueData : []);

        const metricsRes = await fetch('http://localhost:5000/api/admin/metrics', { headers: { 'Authorization': data.token } });
        const metricsData = await metricsRes.json();
        if (metricsData && !metricsData.error) setMetrics(metricsData);
      } else if (authenticatedRole === 'customer') {
        try {
          const portfolioRes = await fetch('http://localhost:5000/api/customer/portfolio', { headers: { 'Authorization': data.token } });
          const portfolioData = await portfolioRes.json();
          setPortfolio({
            active: portfolioData && portfolioData.active ? portfolioData.active : [],
            applications: portfolioData && portfolioData.applications ? portfolioData.applications : []
          });
        } catch {
          setPortfolio({ active: [], applications: [] });
        }
      }
    } else { 
      alert(data.error); 
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regForm)
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setToken(data.token);
      setRole(data.role);
      setPage('customer');
    } else { alert(data.error); }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    navigateTo('home');
  };

  const handleCalculate = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/calculator/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calcData)
    });
    const data = await res.json();
    setCalcResult(data);
    setLoading(false);
  };

  const loadCustomerPortfolio = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/customer/portfolio', { headers: { 'Authorization': token } });
        const data = await res.json();
        setPortfolio({
            active: data && data.active ? data.active : [],
            applications: data && data.applications ? data.applications : []
        });
    } catch {
        setPortfolio({ active: [], applications: [] });
    }
  };

  const handleApplyLoan = async () => {
    if (!panFile || !aadhaarFile || !salaryFile) {
        return alert("Please upload all required KYC compliance documents to proceed.");
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('scheme_id', appForm.scheme_id);
    formData.append('amount', appForm.amount);
    formData.append('tenure', appForm.tenure);
    formData.append('pan_card', panFile);
    formData.append('aadhaar_card', aadhaarFile);
    formData.append('salary_slip', salaryFile);

    // ✅ FIXED: Pass ONLY your authorization token string down. 
    // Do NOT include any 'Content-Type' keys here!
    const res = await fetch('http://localhost:5000/api/customer/apply', {
      method: 'POST',
      headers: { 
        'Authorization': token 
      }, 
      body: formData // The browser will append the correct 'multipart/form-data; boundary=...' header automatically
    });
    
    const data = await res.json();
    setLoading(false);
    if (data.error) { alert(data.error); } else { alert(data.message); }
    loadCustomerPortfolio();
  };

  const loadAdminQueue = async () => {
    const res = await fetch('http://localhost:5000/api/admin/queue', { headers: { 'Authorization': token } });
    const data = await res.json();
    setAdminQueue(data);
  };

  const loadAdminMetrics = async () => {
    const res = await fetch('http://localhost:5000/api/admin/metrics', { headers: { 'Authorization': token } });
    const data = await res.json();
    if (!data.error) { setMetrics(data); }
  };

  useEffect(() => {
    if (!token || !role) return;

    let cancelled = false;

    const loadSessionData = async () => {
      if (ADMIN_ROLES.includes(role)) {
        const queueRes = await fetch('http://localhost:5000/api/admin/queue', { headers: { 'Authorization': token } });
        const queueData = await queueRes.json();
        if (cancelled) return;
        setAdminQueue(Array.isArray(queueData) ? queueData : []);

        const metricsRes = await fetch('http://localhost:5000/api/admin/metrics', { headers: { 'Authorization': token } });
        const metricsData = await metricsRes.json();
        if (!cancelled && metricsData && !metricsData.error) setMetrics(metricsData);
      } else if (role === 'customer') {
        try {
          const res = await fetch('http://localhost:5000/api/customer/portfolio', { headers: { 'Authorization': token } });
          const data = await res.json();
          if (!cancelled) {
            setPortfolio({
              active: data && data.active ? data.active : [],
              applications: data && data.applications ? data.applications : []
            });
          }
        } catch {
          if (!cancelled) setPortfolio({ active: [], applications: [] });
        }
      }
    };

    loadSessionData();

    return () => {
      cancelled = true;
    };
  }, [token, role]);

  const handleAdminAction = async (appId, action) => {
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/admin/evaluate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ application_id: appId, action })
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) alert(`Process Blocked: ${data.error}`); else alert(data.message);
    loadAdminQueue();
    loadAdminMetrics(); 
  };

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="vault-spinner"></div>
          <div className="loading-text">Securing Ledger Connect...</div>
        </div>
      )}

      <div className="app-container">
        <h1>🏦 Apex Core Retail Bank Platform</h1>
        
        <div className="nav-bar">
          <button onClick={() => navigateTo('home')} className={page === 'home' ? 'active' : ''}>Home</button>
          <button onClick={() => navigateTo('policies')} className={page === 'policies' ? 'active' : ''}>Policy Handbook</button>
          <button onClick={() => navigateTo('calculator')} className={page === 'calculator' ? 'active' : ''}>Feasibility Calculator</button>
          {role === 'customer' && <button onClick={() => navigateTo('customer')} className={page === 'customer' ? 'active' : ''}>My Dashboard</button>}
          {ADMIN_ROLES.includes(role) && <button onClick={() => navigateTo('admin')} className={page === 'admin' ? 'active' : ''}>Admin Panel</button>}
          {token && <button onClick={logout} style={{ marginLeft: 'auto', background: '#dc2626' }}>Logout</button>}
        </div>

        {/* 🔀 WORKSPACE CONTROL ROUTER */}
        {page === 'home' && (
          <Home 
            loginEmail={loginEmail} setLoginEmail={setLoginEmail}
            loginPass={loginPass} setLoginPass={setLoginPass}
            handleLogin={handleLogin} regForm={regForm} setRegForm={setRegForm}
            handleRegister={handleRegister}
          />
        )}

        {page === 'policies' && (
          <div className="card">
            <h2>Bank Underwriting Policy Guidelines Handbook</h2>
            <p>All credit extensions are evaluated automatically against baseline risk factors:</p>
            <ul>
              <li><b>Absolute Minimum Income Rule:</b> Candidates must yield the floor income tracked by the product line catalog metrics.</li>
              <li><b>50% FOIR Protection Rule:</b> System calculations throw an error if the generated loan EMI consumes more than 50% of your salary.</li>
              <li><b>KYC File Validation Protocol:</b> Applications remain frozen until verified attachments (PAN/Aadhaar/Slip) match compliance profiles.</li>
            </ul>
          </div>
        )}

        {page === 'calculator' && (
          <div className="card">
            <h2>🧮 Automated Loan Feasibility Matrix Calculator</h2>
            <label>Intended Financial Scheme Line</label>
            <select value={calcData.scheme_id} onChange={e => setCalcData({ ...calcData, scheme_id: e.target.value })}>
              {schemes.length > 0 ? (
                schemes.map(s => {
                  const id = s.scheme_id || s.SCHEME_ID;
                  const name = s.scheme_name || s.SCHEME_NAME;
                  const rate = s.interest_rate || s.INTEREST_RATE;
                  return <option key={id} value={id}>{name} ({parseFloat(rate).toFixed(2)}%)</option>;
                })
              ) : <option value="">⚠️ Synchronizing with Bank Schemes Database...</option>}
            </select>
            <label>Net Monthly Income Asset (₹)</label>
            <input type="number" value={calcData.income} onChange={e => setCalcData({ ...calcData, income: parseFloat(e.target.value) || 0 })} />
            <label>Requested Principal Amount (₹)</label>
            <input type="number" value={calcData.amount} onChange={e => setCalcData({ ...calcData, amount: parseFloat(e.target.value) || 0 })} />
            <label>Repayment Amortization Months</label>
            <input type="number" value={calcData.tenure} onChange={e => setCalcData({ ...calcData, tenure: parseInt(e.target.value) || 0 })} />
            <button className="action-btn" onClick={handleCalculate}>Evaluate Suitability</button>
            {calcResult && (
              <div style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '16px', color: calcResult.feasible ? 'green' : 'red' }}>
                {calcResult.feasible ? `✅ Feasible. Estimated Monthly EMI: ₹${calcResult.emi}/month.` : `❌ Infeasible. Reason: ${calcResult.reason}`}
              </div>
            )}
          </div>
        )}

        {page === 'customer' && (
          <CustomerDashboard 
            schemes={schemes} appForm={appForm} setAppForm={setAppForm}
            setPanFile={setPanFile} setAadhaarFile={setAadhaarFile} setSalaryFile={setSalaryFile}
            handleApplyLoan={handleApplyLoan} portfolio={portfolio}
          />
        )}

        {page === 'admin' && (
          <AdminPanel 
            adminQueue={adminQueue} metrics={metrics} 
            handleAdminAction={handleAdminAction} token={token} setLoading={setLoading}
          />
        )}
      </div>

      <footer className="fintech-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Apex Digital Core Institutional Bank</h3>
            <p>Empowering retail growth via automated algorithmic underwriting models.</p>
          </div>
          <div className="footer-contacts">
            <div className="footer-item"><span>Support Line: </span>+1 (800) 555-APEX</div>
            <div className="footer-item"><span>Corporate Desk: </span>underwriting@apexbank.com</div>
            <div className="footer-item"><span>Location: </span>Financial District, Vault Corporate Tower</div>
          </div>
        </div>
      </footer>
    </>
  );
}