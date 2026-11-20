/**
 * Real HTTP client for backend integration.
 * Calls relative /api/... URLs with credentials included.
 */

const BASE_URL = '/api';

export async function request(method, path, body = null, customHeaders = {}) {
  const url = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;

  const headers = {
    'Accept': 'application/json',
    ...customHeaders,
  };

  const options = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include',
  };

  if (body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);

    if (res.status === 401) {
      localStorage.removeItem('sentinelpay_session');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      const err = new Error('Unauthorized');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errPayload = data?.error || {
        code: `HTTP_${res.status}`,
        message: data?.message || res.statusText || 'Request failed',
      };
      const error = new Error(errPayload.message);
      error.code = errPayload.code;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.code) throw err;
    const networkError = new Error(err.message || 'Network request failed');
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }
}
