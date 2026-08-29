import { request } from './client';

// Device push-token registration. Called once per login/token-refresh and on
// logout so the backend only ever holds live FCM tokens for a user's devices.
export const notificationsApi = {
  registerToken: (token, platform) =>
    request('/notifications/register-token', { method: 'POST', body: { token, platform } }),

  unregisterToken: (token) =>
    request('/notifications/unregister-token', { method: 'POST', body: { token } }),
};
