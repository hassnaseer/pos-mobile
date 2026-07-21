import React from 'react';
import TemplateDesigner from '../Settings/TemplateDesigner';
import { useGamingTicketTemplate, useUpdateGamingTicketTemplate } from '../../../../services/api/posApi';

export default function GamingTicketTemplateScreen() {
  return (
    <TemplateDesigner
      title="Gaming Ticket Template"
      subtitle="Customize the printed gaming tickets given to customers"
      useTemplateHook={useGamingTicketTemplate}
      useUpdateHook={useUpdateGamingTicketTemplate}
      footerPlaceholder="e.g. Enjoy your game! Please keep this ticket."
    />
  );
}
