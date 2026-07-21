/**
 * Mirrors web's frontend/src/app/pages/admin/payroll/printUtils.ts generateSlipHtml
 * exactly (same markup/logic) for the admin, template-driven payslip.
 */
const FONT_SIZES = { small: '12px', medium: '13px', large: '15px' };

export function generateSlipHtml(s, period, businessName, symbol, template = {}, business = {}) {
  const fmtAmt = n => `${symbol}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // Historical Commission figures are always PKR-denominated (per the old, now-removed
  // commission structure's own dollar rate), regardless of the business's display currency.
  const fmtPKR = n => `PKR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const color = template.primaryColor || '#2563eb';
  const baseFontSize = FONT_SIZES[template.fontSize] ?? FONT_SIZES.medium;
  const isMinimal = template.style === 'minimal';
  const isModern = template.style === 'modern';

  const logoHtml = template.showLogo && business.logoUrl
    ? `<img src="${business.logoUrl}" style="display:block;max-height:48px;max-width:140px;object-fit:contain;margin-bottom:6px" alt="logo"/>`
    : '';
  const bizNameHtml = template.showBusinessName ? `<div class="company">${businessName}</div>` : '';
  const bizSubLines = [
    template.showBusinessPhone && business.phone ? business.phone : '',
    template.showBusinessEmail && business.email ? business.email : '',
    template.showBusinessAddress && business.address ? business.address : '',
  ].filter(Boolean);
  const bizSubHtml = bizSubLines.length ? `<div class="biz-sub">${bizSubLines.join(' &nbsp;&middot;&nbsp; ')}</div>` : '';

  const lineItems = [{ label: 'Claims Added', amount: s.claimsTotal, cls: 'pos' }];
  if (s.lateDeduction > 0) lineItems.push({ label: 'Late Arrival', amount: -s.lateDeduction, cls: 'neg' });
  if (s.halfDayDeduction > 0) lineItems.push({ label: 'Half-Day / Absence', amount: -s.halfDayDeduction, cls: 'neg' });
  if (s.breakDeduction > 0) lineItems.push({ label: 'Excess Break', amount: -s.breakDeduction, cls: 'neg' });
  if (s.fineDeduction > 0) lineItems.push({ label: 'Fine', amount: -s.fineDeduction, cls: 'neg' });
  if (s.advanceDeduction > 0) lineItems.push({ label: 'Advance Repayment', amount: -s.advanceDeduction, cls: 'neg' });
  if (s.transportDeduction > 0) lineItems.push({ label: 'Transportation Deduction', amount: -s.transportDeduction, cls: 'neg' });
  if (s.commissionTotal > 0) lineItems.push({ label: 'Commission', amount: s.commissionTotal, cls: 'pos' });

  const lineItemsHtml = lineItems.map(li => `
    <tr><td class="${li.cls}">${li.label}</td><td class="${li.cls}">${li.amount < 0 ? '-' : '+'}${li.label === 'Commission' ? fmtPKR(li.amount) : fmtAmt(Math.abs(li.amount))}</td></tr>
  `).join('');

  const headerStyle = isModern
    ? `background:${color};color:#fff;padding:24px 32px;margin:-48px -48px 28px -48px;border-bottom:none`
    : isMinimal
      ? `border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:24px`
      : `border-bottom:2px solid ${color};padding-bottom:20px;margin-bottom:28px`;

  const badgeStyle = isModern
    ? `background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3)`
    : `background:${color}1a;color:${color};border:1px solid ${color}55`;

  const companyColor = isModern ? '#fff' : '#1a1a1a';
  const subColor = isModern ? 'rgba(255,255,255,.85)' : '#6b7280';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip - ${period}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;padding:48px;max-width:680px;margin:0 auto;font-size:${baseFontSize}}
    .header{display:flex;justify-content:space-between;align-items:flex-start;${headerStyle}}
    .company{font-size:22px;font-weight:700;color:${companyColor}}
    .biz-sub{font-size:11px;color:${subColor};margin-top:4px}
    .slip-title{font-size:13px;color:${subColor};margin-top:4px}
    .badge{${badgeStyle};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .section{margin-bottom:24px}
    .section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .info-item .label{font-size:11px;color:#9ca3af;margin-bottom:2px}
    .info-item .value{font-size:14px;font-weight:600}
    table{width:100%;border-collapse:collapse}
    td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:1em}
    td:last-child{text-align:right;font-weight:600}
    .pos{color:#2563eb}.neg{color:#dc2626}
    .net{background:${color}0f;border:2px solid ${color};border-radius:10px;padding:20px;text-align:center;margin-top:20px}
    .net .lbl{font-size:12px;color:#6b7280;margin-bottom:6px}
    .net .amt{font-size:32px;font-weight:700;color:${color}}
    .footer{margin-top:40px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px}
  </style></head><body>
  <div class="header">
    <div>${logoHtml}${bizNameHtml}<div class="slip-title">Salary Slip</div>${bizSubHtml}</div>
    <span class="badge">${period}</span>
  </div>
  <div class="section">
    <div class="section-title">Employee Details</div>
    <div class="info-grid">
      <div class="info-item"><div class="label">Name</div><div class="value">${s.employee?.name ?? '—'}</div></div>
      <div class="info-item"><div class="label">Email</div><div class="value">${s.employee?.email ?? '—'}</div></div>
      <div class="info-item"><div class="label">Employee ID</div><div class="value">${s.employee?.employeeId ?? '—'}</div></div>
      <div class="info-item"><div class="label">Working Days</div><div class="value">${s.workingDays ?? '—'}</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Salary Breakdown</div>
    <table>
      <tr><td>Base Salary</td><td>${fmtAmt(s.baseSalary)}</td></tr>
      ${lineItemsHtml}
    </table>
    <div class="net"><div class="lbl">Net Pay</div><div class="amt">${fmtAmt(s.netPay)}</div></div>
  </div>
  <div class="footer">${template.footerText ?? ''}<br/>Generated on ${new Date().toLocaleDateString()}</div>
  </body></html>`;
}

/**
 * Mirrors web's frontend/src/app/pages/employee/payslips/PayslipCard.tsx downloadSlip —
 * the simplified, non-template-driven HTML staff use for their own payslips
 * (staff can't reach /admin/payslip-template or /admin/settings).
 */
export function buildEmployeePayslipHtml(slip, period, businessName, employeeName, employeeEmail, symbol) {
  const fmtAmt = n => `${symbol}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip - ${period}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;padding:48px;max-width:680px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #e5e7eb;margin-bottom:28px}
      .company{font-size:22px;font-weight:700}.slip-title{font-size:13px;color:#6b7280;margin-top:4px}
      .badge{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
      .section{margin-bottom:24px}
      .section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .info-item .label{font-size:11px;color:#9ca3af;margin-bottom:2px}
      .info-item .value{font-size:14px;font-weight:600}
      table{width:100%;border-collapse:collapse}
      td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px}
      td:last-child{text-align:right;font-weight:600}
      .pos{color:#2563eb}.neg{color:#dc2626}
      .net{background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:20px;text-align:center;margin-top:20px}
      .net .lbl{font-size:12px;color:#6b7280;margin-bottom:6px}
      .net .amt{font-size:32px;font-weight:700;color:#16a34a}
      .footer{margin-top:40px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px}
    </style></head><body>
    <div class="header">
      <div><div class="company">${businessName ?? 'Business'}</div><div class="slip-title">Salary Slip</div></div>
      <span class="badge">${period}</span>
    </div>
    <div class="section">
      <div class="section-title">Employee Details</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Name</div><div class="value">${employeeName ?? '—'}</div></div>
        <div class="info-item"><div class="label">Email</div><div class="value">${employeeEmail ?? '—'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Salary Breakdown</div>
      <table>
        <tr><td>Base Salary</td><td>${fmtAmt(slip.baseSalary)}</td></tr>
        <tr><td class="pos">Claims Added</td><td class="pos">+${fmtAmt(slip.claimsTotal)}</td></tr>
        <tr><td class="neg">Deductions</td><td class="neg">-${fmtAmt(slip.deductions)}</td></tr>
      </table>
      <div class="net"><div class="lbl">Net Pay</div><div class="amt">${fmtAmt(slip.netPay)}</div></div>
    </div>
    <div class="footer">This is a computer-generated payslip and does not require a signature.<br/>Generated on ${new Date().toLocaleDateString()}</div>
    </body></html>`;
}
