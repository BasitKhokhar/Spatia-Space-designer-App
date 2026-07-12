import { request } from './client';

// Auth endpoints. Each returns { user, accessToken, refreshToken } for the
// session-establishing calls; the auth store persists the tokens via session.js.
export const authApi = {
  login: (email, password) =>
    request('/auth/users/login', { method: 'POST', auth: false, body: { email, password } }),

  signup: (name, email, password, phone) =>
    request('/auth/users/signup', {
      method: 'POST',
      auth: false,
      body: { name, email, password, phone, termsStatus: true },
    }),

  googleLogin: (idToken) =>
    request('/auth/users/google-login', { method: 'POST', auth: false, body: { idToken } }),

  logout: () => request('/auth/users/logout', { method: 'POST' }),

  deleteAccount: () => request('/auth/users/delete', { method: 'DELETE' }),

  updatePassword: (previousPassword, newPassword) =>
    request('/auth/users/update-password', { method: 'PUT', body: { previousPassword, newPassword } }),

  // Forgot-password OTP flow
  forgotPasswordRequest: (email) =>
    request('/auth/users/forgot-password/request', { method: 'POST', auth: false, body: { email } }),

  forgotPasswordVerify: (email, otp) =>
    request('/auth/users/forgot-password/verify', { method: 'POST', auth: false, body: { email, otp } }),

  forgotPasswordReset: (resetToken, newPassword) =>
    request('/auth/users/forgot-password/reset', { method: 'POST', auth: false, body: { resetToken, newPassword } }),
};
