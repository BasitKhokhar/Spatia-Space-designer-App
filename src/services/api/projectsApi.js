import { request } from './client';

// Project (floor-plan) CRUD. Server returns projects with a numeric `id` and a
// nested `plan` object matching domain/floorplan.js.
export const projectsApi = {
  list: () => request('/projects'),

  create: ({ name, roomType, variant, width, length, plan }) =>
    request('/projects', { method: 'POST', body: { name, roomType, variant, width, length, plan } }),

  get: (id) => request(`/projects/${id}`),

  update: (id, patch) => request(`/projects/${id}`, { method: 'PATCH', body: patch }),

  remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};
