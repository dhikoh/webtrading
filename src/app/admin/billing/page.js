'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [targetTenant, setTargetTenant] = useState('');
  const [targetPlan, setTargetPlan] = useState('STARTER');
  const [pricePaid, setPricePaid] = useState('');
  const [months, setMonths] = useState(1);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
        setPlans(data.plans);
      }

      // Also get tenants list for select options mapping
      const tenantRes = await fetch('/api/admin/tenants');
      const tenantData = await tenantRes.json();
      if (tenantData.success) {
        setTenants(tenantData.tenants);
        if (tenantData.tenants.length > 0) {
          setTargetTenant(tenantData.tenants[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualActivate = async (e) => {
    e.preventDefault();
    if (!targetTenant || !targetPlan) return;
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MANUAL_ACTIVATE',
          tenantId: targetTenant,
          planName: targetPlan,
          pricePaid: parseFloat(pricePaid) || undefined,
          monthsToAdd: Number(months)
        })
      });
      const data = await res.json();
      if (data.success) {
        setPricePaid('');
        fetchBillingData();
        alert('Plan manually activated successfully!');
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefund = async (invoice) => {
    if (!confirm(`Refund invoice ${invoice.invoiceNumber}? This will register a negative amount ledger entry.`)) return;
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_REFUND',
          tenantId: invoice.tenantId,
          planName: invoice.planName,
          pricePaid: invoice.amount
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <span>⚡ Loading Billing Ledger Console...</span>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <header style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
          💳 Manual Subscription & Billing Governance
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Manually activate premium customer plans, issue refunds, and track general invoice histories
        </p>
      </header>

      {/* Manual Action form */}
      <section className={styles.grid}>
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>➕ Manual Activation Wizard</h3>
          <form onSubmit={handleManualActivate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Tenant Workspace</label>
              <select value={targetTenant} onChange={(e) => setTargetTenant(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', marginTop: '4px' }}>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subscriptionPlan})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Plan Package</label>
                <select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', marginTop: '4px' }}>
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Duration (Months)</label>
                <input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom Price Paid ($)</label>
              <input type="number" placeholder="Leave empty for default plan monthly price" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
            </div>

            <button type="submit" className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', color: '#fff', marginTop: '8px' }}>
              Activate Subscription Plan
            </button>
          </form>
        </div>

        {/* Pricing Plan limits viewer */}
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>📊 Subscription Packages Catalog</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{plan.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Daily Scan Limit: {plan.maxDailyScan} | Active Signals Limit: {plan.maxActiveSignals}
                  </span>
                </div>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '1rem' }}>
                  ${plan.priceMonthly}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Invoice list table */}
      <section className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
        <h3>Invoices and Payment History</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.governanceTable}>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Tenant Workspace</th>
                <th>Package Plan</th>
                <th>Price Paid</th>
                <th>Method</th>
                <th>Date</th>
                <th>Refund</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{inv.invoiceNumber}</td>
                  <td>{inv.tenant?.name || 'Workspace'}</td>
                  <td>{inv.planName}</td>
                  <td style={{ fontWeight: 'bold', color: inv.amount < 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)' }}>
                    {inv.amount < 0 ? `-$${Math.abs(inv.amount)}` : `$${inv.amount}`}
                  </td>
                  <td>{inv.paymentMethod}</td>
                  <td>{new Date(inv.createdAt).toLocaleString()}</td>
                  <td>
                    {inv.amount > 0 ? (
                      <button className={styles.actionBtn} style={{ color: 'rgb(239, 68, 68)' }} onClick={() => handleRefund(inv)}>
                        Refund
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
