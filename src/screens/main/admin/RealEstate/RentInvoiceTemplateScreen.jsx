import React from 'react';
import TemplateDesigner from '../Settings/TemplateDesigner';
import { useRentInvoiceTemplate, useUpdateRentInvoiceTemplate } from '../../../../services/api/posApi';

export default function RentInvoiceTemplateScreen() {
  return (
    <TemplateDesigner
      title="Rent Invoice Template"
      subtitle="Customize the printed rent invoices sent to tenants"
      useTemplateHook={useRentInvoiceTemplate}
      useUpdateHook={useUpdateRentInvoiceTemplate}
      footerPlaceholder="e.g. Thank you for your timely payment."
    />
  );
}
