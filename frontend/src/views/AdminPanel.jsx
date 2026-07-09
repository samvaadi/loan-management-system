export default function AdminPanel({ adminQueue, metrics, handleAdminAction, token, setLoading }) {
  return (
    <div className="card">
      <h2>🛠️ Risk Underwriter Operations Console</h2>
      <p>Review current inbound applications below. Core financial parameters and 50% FOIR policies compile through database procedure tasks during approval steps.</p>
      
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px', marginTop: '15px' }}>
        <div className="metric-card" style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', padding: '15px', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Disbursed Capital</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#16a34a', fontSize: '20px' }}>₹{parseFloat(metrics.totalDisbursed || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="metric-card" style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '15px', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Ledger Exposure</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#dc2626', fontSize: '20px' }}>₹{parseFloat(metrics.totalExposure || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="metric-card" style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '15px', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>Live Accounts</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#2563eb', fontSize: '20px' }}>{metrics.activeLoans || 0} Portfolios</h3>
        </div>
        <div className="metric-card" style={{ background: '#f8fafc', borderLeft: '4px solid #64748b', padding: '15px', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>Conversion Metrics</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#334155', fontSize: '20px' }}>{metrics.conversionRate || "0.0"}% Rate</h3>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>App ID</th><th>Applicant Profile</th><th>Monthly Income</th><th>Principal Requested</th><th>Tenure</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {Array.isArray(adminQueue) && adminQueue.length > 0 ? (
            adminQueue.map(q => (
              <tr key={q.application_id}>
                <td>{q.application_id}</td>
                <td><b>{q.name}</b></td>
                <td>₹{parseFloat(q.monthly_income || 0).toLocaleString('en-IN')}</td>
                <td>₹{parseFloat(q.amount_applied || 0).toLocaleString('en-IN')}</td>
                <td>{q.tenure_months} Months</td>
                <td>
                  <button onClick={() => handleAdminAction(q.application_id, 'Approve')} style={{ background: '#10b981', color: 'white', marginRight: '6px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Approve</button>
                  <button onClick={() => handleAdminAction(q.application_id, 'Reject')} style={{ background: '#ef4444', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reject</button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No pending applications found in queue.</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px dashed #cbd5e1' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '18px' }}>🛡️ Provision Employee Credentials</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
            Authorized Systems Access: This deployment sequence generates high-privilege administrative profiles.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>First Name</label>
              <input type="text" id="adm_first" placeholder="First Name" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Last Name</label>
              <input type="text" id="adm_last" placeholder="Last Name" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Corporate Email ID</label>
          <input type="email" id="adm_email" placeholder="username@bank.com" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />

          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Temporary Security Key</label>
          <input type="password" id="adm_pass" placeholder="••••••••" style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />

          <button 
            className="action-btn" 
            style={{ background: '#2563eb', color: 'white', width: '100%', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={async () => {
              const first_name = document.getElementById('adm_first').value;
              const last_name = document.getElementById('adm_last').value;
              const email = document.getElementById('adm_email').value;
              const password = document.getElementById('adm_pass').value;

              if (!first_name || !last_name || !email || !password) {
                return alert("Verification Blocked: All employee input rows must be completed.");
              }

              setLoading(true);
              const response = await fetch('http://localhost:5000/api/admin/create-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ first_name, last_name, email, password })
              });
              const result = await response.json();
              setTimeout(() => setLoading(false), 300);

              if (result.success) {
                alert(result.message);
                document.getElementById('adm_first').value = '';
                document.getElementById('adm_last').value = '';
                document.getElementById('adm_email').value = '';
                document.getElementById('adm_pass').value = '';
              } else {
                alert(`Access Modification Refused: ${result.error}`);
              }
            }}
          >
            Authorize and Generate Admin Account
          </button>
        </div>
      </div>
    </div>
  );
}