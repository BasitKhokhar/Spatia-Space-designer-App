import { request } from './client';

// Reporting AI-generated content.
//
// Required by Play's AI-Generated Content policy: a user must be able to flag
// offensive AI output from inside the app. These land in a table an admin
// reviews rather than an inbox, so a report can actually change something.
//
// The reason codes are a fixed vocabulary shared with the backend
// (controllers/reportController.js) — keep the two in step.
export const REPORT_REASONS = [
  { key: 'offensive', label: 'Offensive or inappropriate' },
  { key: 'sexual', label: 'Sexual content' },
  { key: 'violent', label: 'Violent content' },
  { key: 'hateful', label: 'Hateful or discriminatory' },
  { key: 'unsafe_design', label: 'Unsafe or dangerous design' },
  { key: 'inaccurate', label: 'Wrong or misleading' },
  { key: 'other', label: 'Something else' },
];

export const reportsApi = {
  // `projectId` is the server-side project id; the backend resolves the
  // generation behind it when aiJobId isn't known, so the app can report a
  // design it only has a project for.
  submit: ({ projectId, aiJobId, reason, details }) =>
    request('/reports', {
      method: 'POST',
      body: { targetType: 'ai_project', projectId, aiJobId, reason, details },
    }),

  mine: () => request('/reports'),
};
