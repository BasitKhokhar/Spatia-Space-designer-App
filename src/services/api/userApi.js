import { request } from './client';

// Profile CRUD against the authenticated user's own record.
export const userApi = {
  getMe: () => request('/users/userdetails'),

  updateMe: ({ name, phone }) =>
    request('/users/updateUser', { method: 'PUT', body: { name, phone } }),
};
