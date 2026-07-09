export default function Home({ 
  loginEmail, setLoginEmail, 
  loginPass, setLoginPass, 
  handleLogin, regForm, setRegForm, 
  handleRegister 
}) {
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Sign In to Account</h3>
        <label>Email ID</label>
        <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
        <label>Password Master</label>
        <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
        <button className="action-btn" onClick={handleLogin}>Authenticate Account</button>
      </div>
      
      <div className="card">
        <h3>Open Fresh Retail Account</h3>
        <label>First Name</label>
        <input type="text" value={regForm.first_name} onChange={e => setRegForm({...regForm, first_name: e.target.value})} />
        <label>Last Name</label>
        <input type="text" value={regForm.last_name} onChange={e => setRegForm({...regForm, last_name: e.target.value})} />
        <label>Email ID</label>
        <input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} />
        <label>Password Choice</label>
        <input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
        <label>Age Metric</label>
        <input type="number" value={regForm.age} onChange={e => setRegForm({...regForm, age: parseInt(e.target.value) || 0})} />
        <label>Net Monthly Income (₹)</label>
        <input type="number" value={regForm.monthly_income} onChange={e => setRegForm({...regForm, monthly_income: parseFloat(e.target.value) || 0})} />
        <button className="action-btn" onClick={handleRegister}>Create Secure Profile</button>
      </div>
    </div>
  );
}