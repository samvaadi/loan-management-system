export default function CustomerDashboard({
  schemes, appForm, setAppForm,
  setPanFile, setAadhaarFile, setSalaryFile,
  handleApplyLoan, portfolio
}) {
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Submit Fresh Loan Application Bundle</h3>
        <label>Select Target Loan Product</label>
        <select value={appForm.scheme_id} onChange={e => setAppForm({ ...appForm, scheme_id: e.target.value })}>
          {schemes.map(s => {
            const id = s.scheme_id || s.SCHEME_ID;
            const name = s.scheme_name || s.SCHEME_NAME;
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>
        
        <label>Principal Amount Requested (₹)</label>
        <input type="number" value={appForm.amount} onChange={e => setAppForm({ ...appForm, amount: e.target.value })} />
        <label>Intended Amortization Months</label>
        <input type="number" value={appForm.tenure} onChange={e => setAppForm({ ...appForm, tenure: e.target.value })} />
        
        <label className="file-label">PAN Card Attachment</label>
        <input type="file" onChange={e => setPanFile(e.target.files[0])} />
        <label className="file-label">Aadhaar Card Attachment</label>
        <input type="file" onChange={e => setAadhaarFile(e.target.files[0])} />
        <label className="file-label">Verified Salary Slip File</label>
        <input type="file" onChange={e => setSalaryFile(e.target.files[0])} />
        
        <button className="action-btn" onClick={handleApplyLoan}>Submit Application Files</button>
      </div>

      <div>
        {Array.isArray(portfolio?.active) && portfolio.active.length > 0 && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px' }}>
            <div>
              <h4 style={{ margin: 0, color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Verified Financial Risk Status</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Automated machine algorithms parsed your file parameters.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>CREDIT SCORE</span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: '900', 
                color: portfolio.active[0].credit_score >= 750 ? '#10b981' : portfolio.active[0].credit_score >= 650 ? '#2563eb' : '#ef4444' 
              }}>
                {portfolio.active[0].credit_score || 'N/A'}
              </span>
            </div>
          </div>
        )}

        <h3>📊 Your Active Account Ledger Portfolio</h3>
        {Array.isArray(portfolio?.active) && portfolio.active.length > 0 ? (
          <div className="card" style={{ borderLeft: '5px solid #10b981', background: '#f0fdf4' }}>
            <p><b>Sanctioned Loan Principal:</b> ₹{parseFloat(portfolio.active[0].sanctioned_amount).toLocaleString('en-IN')}</p>
            <p style={{ color: '#dc2626', fontSize: '18px' }}><b>Pending Outstanding Amount:</b> ₹{parseFloat(portfolio.active[0].remaining_balance).toLocaleString('en-IN')}</p>
            <p style={{ color: '#16a34a', fontSize: '18px' }}><b>Monthly EMI Obligation:</b> ₹{parseFloat(portfolio.active[0].monthly_emi).toLocaleString('en-IN')}/mo</p>
            <p><b>Assigned Rate:</b> {portfolio.active[0].interest_rate}% Fixed APR | <b>Tenure Left:</b> {portfolio.active[0].tenure_remaining_months} Months</p>
          </div>
        ) : <p>No active loan account tracks running.</p>}

        <h3>Historical Applications Tracking</h3>
        <table>
          <thead><tr><th>ID</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {(portfolio?.applications || []).map(a => (
              <tr key={a.application_id}>
                <td>{a.application_id}</td>
                <td>₹{parseFloat(a.amount_applied).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}