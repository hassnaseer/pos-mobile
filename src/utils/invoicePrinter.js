/**
 * Mirrors web's frontend/src/app/pages/admin/pos/invoicePrinter.ts buildSalesInvoiceHtml
 * exactly (same markup/logic), minus the in-page "Print" button since mobile triggers
 * printing/sharing from native UI instead of window.print().
 */
export function buildSalesInvoiceHtml(opts) {
  const {
    order, cart, businessName, businessPhone, businessEmail, businessAddress,
    symbol, invoiceTerms, subtotal, excludedTaxes, includedTaxes, cartMiscCharges,
    selectedCustomer, template,
  } = opts;

  const cfg = template ?? {};
  const color = cfg.primaryColor ?? '#2563eb';
  const style = cfg.style ?? 'classic';
  const isThermal = cfg.paperSize === 'thermal-58' || cfg.paperSize === 'thermal-80';
  const maxW = cfg.paperSize === 'thermal-58' ? 220 : cfg.paperSize === 'thermal-80' ? 302 : 480;
  const fsMap = { small: '11px', medium: '13px', large: '15px' };
  const fs = fsMap[cfg.fontSize ?? 'medium'] ?? '13px';
  const pad = isThermal ? '14px' : '28px';

  const footerMsg = cfg.typeOverrides?.sales?.footerMessage ?? 'Thank you for your business!';
  const customerName = selectedCustomer?.name ?? 'Walk-in Customer';
  const customerPhone = selectedCustomer?.phone ?? null;
  const customerEmail = selectedCustomer?.email ?? null;

  const isPartial = (order.balanceDue ?? 0) > 0;
  const change = !isPartial && order.paymentMethod === 'Cash' && (order.amountReceived ?? 0) > order.totalAmount
    ? (order.amountReceived - order.totalAmount)
    : null;

  const lineRows = cart.map(item => `
    <tr>
      <td style="padding:6px 4px;border-bottom:1px solid #f0f0f0;vertical-align:top">
        ${item.name}
        ${item.warrantyDays ? `<br/><span style="font-size:10px;color:#888">Warranty: ${item.warrantyDays} days</span>` : ''}
      </td>
      <td style="padding:6px 4px;border-bottom:1px solid #f0f0f0;text-align:center;white-space:nowrap">${item.quantity}</td>
      ${!isThermal ? `<td style="padding:6px 4px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap">${symbol}${item.price.toFixed(2)}</td>` : ''}
      <td style="padding:6px 4px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap">${symbol}${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  const showTax = cfg.showTaxBreakdown !== false;
  const taxRows = showTax
    ? excludedTaxes
        .filter(t => t.type === 'excluded')
        .map(t => `<tr>
          <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#555;font-size:12px">${t.name} (${t.percentage}%)</td>
          <td style="padding:3px 4px;text-align:right;font-size:12px">${symbol}${Number(t.amount).toFixed(2)}</td>
        </tr>`).join('')
    : '';
  const inclNote = showTax && includedTaxes.length > 0
    ? `<tr><td colspan="${isThermal ? 2 : 3}" style="padding:2px 4px;text-align:right;color:#aaa;font-size:10px">
        Incl. ${includedTaxes.map(t => `${t.name} ${t.percentage}%`).join(', ')}
       </td><td></td></tr>`
    : '';
  const miscRows = cartMiscCharges.map(mc => {
    const amt = mc.type === 'percentage' ? subtotal * mc.amount / 100 : mc.amount;
    return `<tr>
      <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#555;font-size:12px">${mc.name}</td>
      <td style="padding:3px 4px;text-align:right;font-size:12px">${symbol}${amt.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const paymentRows = isPartial
    ? `<tr>
        <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#16a34a">Amount Paid (${order.paymentMethod})</td>
        <td style="padding:3px 4px;text-align:right;color:#16a34a">${symbol}${Number(order.amountPaid ?? 0).toFixed(2)}</td>
       </tr>
       <tr>
        <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#dc2626;font-weight:700">Balance Due</td>
        <td style="padding:3px 4px;text-align:right;color:#dc2626;font-weight:700">${symbol}${Number(order.balanceDue).toFixed(2)}</td>
       </tr>`
    : `<tr>
        <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#16a34a">&#10003; Paid (${order.paymentMethod})</td>
        <td style="padding:3px 4px;text-align:right;color:#16a34a">${symbol}${Number(order.totalAmount).toFixed(2)}</td>
       </tr>
       ${change != null && change >= 0 ? `<tr>
        <td colspan="${isThermal ? 2 : 3}" style="padding:2px 4px;text-align:right;color:#888;font-size:12px">Change</td>
        <td style="padding:2px 4px;text-align:right;color:#888;font-size:12px">${symbol}${change.toFixed(2)}</td>
       </tr>` : ''}`;

  const bizLines = [
    cfg.showBusinessPhone !== false && businessPhone ? `<div>${businessPhone}</div>` : '',
    cfg.showBusinessEmail !== false && businessEmail ? `<div>${businessEmail}</div>` : '',
    cfg.showBusinessAddress && businessAddress ? `<div>${businessAddress}</div>` : '',
  ].join('');

  let headerHtml = '';
  const showOrderNum = cfg.showOrderNumber !== false;
  const showOrderDt = cfg.showOrderDate !== false;
  const showPayMethod = cfg.showPaymentMethod !== false;

  if (style === 'modern' && !isThermal) {
    headerHtml = `
      <div style="background:${color};color:#fff;padding:20px 24px;margin:-${pad} -${pad} 20px -${pad}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            ${cfg.showBusinessName !== false ? `<div style="font-size:20px;font-weight:700;margin-bottom:4px">${businessName}</div>` : ''}
            <div style="font-size:12px;opacity:0.85;line-height:1.8">${bizLines}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:900;letter-spacing:2px;opacity:0.9">INVOICE</div>
            ${showOrderNum ? `<div style="font-size:12px;opacity:0.75">#${order.orderNumber}</div>` : ''}
            ${showOrderDt ? `<div style="font-size:12px;opacity:0.75">${new Date().toLocaleDateString()}</div>` : ''}
          </div>
        </div>
      </div>`;
  } else if (style === 'classic' && !isThermal) {
    headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid ${color};margin-bottom:16px">
        <div>
          ${cfg.showBusinessName !== false ? `<div style="font-size:20px;font-weight:700;color:${color};margin-bottom:4px">${businessName}</div>` : ''}
          <div style="font-size:12px;color:#555;line-height:1.8">${bizLines}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:900;color:${color};letter-spacing:2px">INVOICE</div>
          ${showOrderNum ? `<div style="font-size:12px;color:#777">#${order.orderNumber}</div>` : ''}
          ${showOrderDt ? `<div style="font-size:12px;color:#777">${new Date().toLocaleDateString()}</div>` : ''}
        </div>
      </div>`;
  } else {
    headerHtml = `
      <div style="text-align:center;padding-bottom:12px;border-bottom:1px dashed #ccc;margin-bottom:10px">
        ${cfg.showBusinessName !== false ? `<div style="font-size:18px;font-weight:700;margin-bottom:2px">${businessName}</div>` : ''}
        <div style="font-size:11px;color:#555;line-height:1.7">${bizLines}</div>
        <div style="font-size:13px;font-weight:700;margin-top:6px;letter-spacing:1px">INVOICE</div>
        ${showOrderNum ? `<div style="font-size:11px;color:#555;margin-top:2px">#${order.orderNumber}</div>` : ''}
        ${showOrderDt ? `<div style="font-size:11px;color:#555">${new Date().toLocaleDateString()}</div>` : ''}
      </div>`;
  }

  let metaHtml = '';
  if (!isThermal) {
    const custLines = [
      `<div style="font-weight:600;font-size:13px">${customerName}</div>`,
      cfg.showCustomerPhone !== false && customerPhone ? `<div style="font-size:12px;color:#555;margin-top:2px">${customerPhone}</div>` : '',
      cfg.showCustomerEmail !== false && customerEmail ? `<div style="font-size:12px;color:#555">${customerEmail}</div>` : '',
    ].join('');
    const detailRows = [
      showOrderNum ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:#888">Invoice #</span><span style="font-weight:600">${order.orderNumber}</span></div>` : '',
      showOrderDt ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:#888">Date</span><span>${new Date().toLocaleDateString()}</span></div>` : '',
      showPayMethod ? `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#888">Payment</span><span>${order.paymentMethod}</span></div>` : '',
    ].join('');
    metaHtml = `
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="flex:1;background:#f9fafb;border-radius:6px;padding:12px;border:1px solid #e5e7eb">
          <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Bill To</div>
          ${custLines}
        </div>
        ${detailRows ? `
        <div style="flex:1;background:#f9fafb;border-radius:6px;padding:12px;border:1px solid #e5e7eb">
          <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Invoice Details</div>
          ${detailRows}
        </div>` : ''}
      </div>`;
  } else {
    metaHtml = `
      <div style="font-size:12px;margin-bottom:8px;line-height:1.7">
        ${showOrderNum ? `<div><b>Invoice #:</b> ${order.orderNumber}</div>` : ''}
        ${showOrderDt ? `<div><b>Date:</b> ${new Date().toLocaleDateString()}</div>` : ''}
        <div><b>Customer:</b> ${customerName}</div>
        ${cfg.showCustomerPhone !== false && customerPhone ? `<div><b>Phone:</b> ${customerPhone}</div>` : ''}
        ${showPayMethod ? `<div><b>Payment:</b> ${order.paymentMethod}</div>` : ''}
      </div>
      <div style="border-top:1px dashed #ccc;margin:6px 0"></div>`;
  }

  const termsHtml = cfg.showTermsConditions !== false && invoiceTerms
    ? `<div style="margin-top:${isThermal ? '10px' : '18px'};padding-top:${isThermal ? '8px' : '14px'};border-top:${isThermal ? '1px dashed #ccc' : '1px solid #e5e7eb'}">
        <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Terms &amp; Conditions</div>
        <div style="font-size:11px;color:#555;line-height:1.6">${invoiceTerms.replace(/\n/g, '<br/>')}</div>
       </div>`
    : '';

  const footerHtml = footerMsg
    ? `<div style="margin-top:${isThermal ? '8px' : '16px'};padding-top:${isThermal ? '6px' : '12px'};border-top:1px ${isThermal ? 'dashed' : 'solid'} #e5e7eb;text-align:center;font-size:12px;color:#888">${footerMsg}</div>`
    : '';

  const thStyle = `padding:7px 4px;text-align:right;font-size:11px;color:${isThermal ? '#555' : color};font-weight:700;text-transform:uppercase;letter-spacing:.3px;border-bottom:2px solid ${isThermal ? '#ccc' : color}`;
  const tableHeaders = isThermal
    ? `<th style="${thStyle.replace('text-align:right', 'text-align:left')}">Item</th><th style="${thStyle}">Qty</th><th style="${thStyle}">Total</th>`
    : `<th style="${thStyle.replace('text-align:right', 'text-align:left')}">Item</th><th style="${thStyle}">Qty</th><th style="${thStyle}">Unit</th><th style="${thStyle}">Total</th>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Invoice ${order.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:${fs};color:#111;background:#fff}
  .page{max-width:${maxW}px;margin:0 auto;padding:${pad}}
</style></head>
<body>
<div class="page" style="${style === 'classic' && !isThermal ? `border-top:4px solid ${color}` : ''}">
  ${headerHtml}
  ${metaHtml}
  <table style="width:100%;border-collapse:collapse">
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <div style="margin-top:10px;padding-top:8px;border-top:2px solid ${isThermal ? '#ccc' : color}20">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr>
        <td colspan="${isThermal ? 2 : 3}" style="padding:3px 4px;text-align:right;color:#555">Subtotal</td>
        <td style="padding:3px 4px;text-align:right">${symbol}${Number(subtotal).toFixed(2)}</td>
      </tr>
      ${taxRows}${inclNote}${miscRows}
      <tr style="border-top:2px solid ${isThermal ? '#ccc' : color}30">
        <td colspan="${isThermal ? 2 : 3}" style="padding:6px 4px;text-align:right;font-weight:700;font-size:16px;color:${color}">TOTAL</td>
        <td style="padding:6px 4px;text-align:right;font-weight:700;font-size:16px;color:${color}">${symbol}${Number(order.totalAmount).toFixed(2)}</td>
      </tr>
      ${paymentRows}
    </table>
  </div>
  ${termsHtml}
  ${footerHtml}
</div>
</body></html>`;
}
