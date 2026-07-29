import { request } from './client';

// AI floor-plan generation. Generation is asynchronous — `start` returns a job
// id and the app polls `job` until it reports succeeded (a multi-floor design
// takes minutes, which no mobile HTTP request will hold open).
//
// Which model actually runs is decided entirely on the server (an admin toggle
// in the dashboard), so nothing here — and no app release — is involved in
// switching between OpenAI and Gemini.
export const aiApi = {
  // Space types, room vocabularies, styles and the current credit cost. Served
  // from the backend so new space types ship without an app update.
  config: () => request('/ai/config'),

  // `clientRequestId` makes this idempotent: a lost response or an offline retry
  // resolves to the same job instead of generating (and charging) twice.
  start: (clientRequestId, brief) =>
    request('/ai/plans', { method: 'POST', body: { clientRequestId, brief } }),

  job: (jobId) => request(`/ai/plans/${jobId}`),

  cancel: (jobId) => request(`/ai/plans/${jobId}/cancel`, { method: 'POST' }),

  // Re-run the same brief for a different arrangement, at the cheaper price.
  variation: (jobId, clientRequestId) =>
    request(`/ai/plans/${jobId}/variation`, { method: 'POST', body: { clientRequestId } }),
};
