/** Single source of truth for the fixed/hardcoded Project category system on mobile —
 *  mirrors `backendProject/src/utils/project-categories.config.ts` and
 *  `frontend/src/app/pages/admin/projects/categories.config.ts` exactly (same keys, labels,
 *  income modes, entry tables and per-category extra fields). See docs/project_plan.md for
 *  the full design. Read by the project create/edit form and the project detail screen's
 *  Sales/Entries section so category-specific behaviour never has to be re-decided in more
 *  than one place.
 *
 *  incomeMode: 'recurring' | 'milestone' | 'fixed'
 *  entryTable: 'ecommerce' | 'call_center' | 'universal' | null
 *    'ecommerce'   -> the existing ProjectIncome table (untouched)
 *    'call_center' -> the dedicated CallCenterEntry table
 *    'universal'   -> the shared ProjectCategoryEntry table (category-specific fields in `extraFields`)
 *    null          -> Milestone-Based / Fixed Amount categories have no entry table at all
 */

export const DEFAULT_CATEGORY_KEY = 'ecommerce';

export const PROJECT_CATEGORIES = [
  { key: 'ecommerce', label: 'E-commerce', incomeMode: 'recurring', entryTable: 'ecommerce' },
  { key: 'call_center', label: 'Call Center', incomeMode: 'recurring', entryTable: 'call_center' },
  {
    key: 'seo', label: 'SEO', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'keywords', label: 'Keyword(s)', type: 'text' },
      { key: 'currentRanking', label: 'Current Ranking', type: 'text' },
      { key: 'targetRanking', label: 'Target Ranking', type: 'text' },
    ],
  },
  {
    key: 'digital_marketing', label: 'Digital Marketing / Social Media Marketing', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'campaignName', label: 'Campaign Name', type: 'text' },
      { key: 'reach', label: 'Reach / Impressions', type: 'number' },
    ],
  },
  {
    key: 'ppc', label: 'PPC / Paid Ads Management', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'adSpend', label: 'Ad Spend', type: 'decimal' },
      { key: 'clicks', label: 'Clicks', type: 'number' },
      { key: 'conversions', label: 'Conversions', type: 'number' },
    ],
  },
  {
    key: 'email_marketing', label: 'Email Marketing', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'campaignName', label: 'Campaign Name', type: 'text' },
      { key: 'emailsSent', label: 'Emails Sent', type: 'number' },
      { key: 'openRate', label: 'Open Rate (%)', type: 'decimal' },
    ],
  },
  {
    key: 'lead_generation', label: 'Lead Generation', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'leadsGenerated', label: 'Leads Generated', type: 'number' },
      { key: 'qualifiedLeads', label: 'Qualified Leads', type: 'number' },
      { key: 'source', label: 'Source / Channel', type: 'text' },
    ],
  },
  { key: 'web_development', label: 'Web Development', incomeMode: 'milestone', entryTable: null },
  { key: 'app_development', label: 'App Development', incomeMode: 'milestone', entryTable: null },
  { key: 'graphic_design', label: 'Graphic Design / Branding', incomeMode: 'fixed', entryTable: null },
  {
    key: 'content_writing', label: 'Content Writing / Copywriting', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'piecesDelivered', label: 'Pieces Delivered', type: 'number' },
      { key: 'wordCount', label: 'Word Count', type: 'number' },
    ],
  },
  { key: 'video_editing', label: 'Video Editing / Production', incomeMode: 'fixed', entryTable: null },
  {
    key: 'virtual_assistant', label: 'Virtual Assistant Services', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'hoursWorked', label: 'Hours Worked', type: 'decimal' },
      { key: 'tasksCompleted', label: 'Tasks Completed', type: 'number' },
    ],
  },
  {
    key: 'bookkeeping', label: 'Bookkeeping / Accounting', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'transactionsProcessed', label: 'Transactions Processed', type: 'number' },
      { key: 'reportsDelivered', label: 'Reports Delivered', type: 'number' },
    ],
  },
  {
    key: 'it_support', label: 'IT Support / Managed IT', incomeMode: 'recurring', entryTable: 'universal',
    fields: [
      { key: 'ticketsResolved', label: 'Tickets Resolved', type: 'number' },
      { key: 'systemsManaged', label: 'Systems Managed', type: 'number' },
    ],
  },
  { key: 'recruitment', label: 'Recruitment / Staffing', incomeMode: 'fixed', entryTable: null },
];

const BY_KEY = new Map(PROJECT_CATEGORIES.map(c => [c.key, c]));

/** null/unset/unknown category always resolves to E-commerce — this is what lets every
 *  existing project (created before this system shipped, with category = null) keep
 *  working with zero backfill, exactly like backend/web. */
export function getCategoryDef(key) {
  if (key) {
    const found = BY_KEY.get(key);
    if (found) return found;
  }
  return BY_KEY.get(DEFAULT_CATEGORY_KEY);
}

export function isRecurringEntriesCategory(key) {
  return getCategoryDef(key).incomeMode === 'recurring';
}
