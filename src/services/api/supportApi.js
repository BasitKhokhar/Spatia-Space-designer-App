import { request } from './client';

// General support requests from the Help & Support "Submit a Request" form.
//
// Distinct from reportsApi.js, which is scoped to one AI generation: this is
// the catch-all path for billing/account/bug issues and Play policy concerns,
// and still has to land somewhere an admin can act on it rather than an inbox.
//
// Category keys are a fixed vocabulary shared with the backend
// (controllers/supportTicketController.js) — keep the two in step. Grouped
// here for the picker sheet; SUPPORT_CATEGORY_MAP is the flat lookup used to
// render whichever one is selected.
export const SUPPORT_CATEGORIES = [
  {
    group: 'Play Store Policy',
    items: [
      { key: 'restricted_content', label: 'Restricted/Inappropriate Content' },
      { key: 'child_safety', label: 'Child Safety' },
      { key: 'ip_copyright', label: 'Intellectual Property/Copyright' },
      { key: 'impersonation', label: 'Impersonation/Deceptive Behavior' },
      { key: 'spam_malware', label: 'Spam/Malware/Harmful Behavior' },
      { key: 'privacy_data', label: 'Privacy & Data Handling' },
      { key: 'billing_issue', label: 'Billing/Subscription Issue' },
      { key: 'policy_other', label: 'Other Play Store Policy Violation' },
    ],
  },
  {
    group: 'AI-Generated Content',
    items: [
      { key: 'ai_sexual_content', label: 'AI-Generated Inappropriate/Sexual Content' },
      { key: 'ai_harassment', label: 'AI-Generated Harassment/Bullying' },
      { key: 'ai_misinformation', label: 'AI-Generated Misinformation' },
      { key: 'ai_hate_speech', label: 'AI-Generated Hate Speech' },
      { key: 'ai_dangerous_content', label: 'AI-Generated Dangerous/Harmful Content' },
      { key: 'ai_copyright', label: 'AI-Generated Copyright/IP Infringement' },
      { key: 'ai_quality', label: 'AI Output Quality/Accuracy Issue' },
    ],
  },
  {
    group: 'General',
    items: [
      { key: 'bug_technical', label: 'Bug/Technical Issue' },
      { key: 'account_issue', label: 'Account Issue' },
      { key: 'other', label: 'Other' },
    ],
  },
];

export const SUPPORT_CATEGORY_MAP = Object.fromEntries(
  SUPPORT_CATEGORIES.flatMap((g) => g.items).map((c) => [c.key, c.label])
);

export const supportApi = {
  submit: ({ email, category, message }) =>
    request('/support-tickets', { method: 'POST', body: { email, category, message } }),

  mine: () => request('/support-tickets'),
};
