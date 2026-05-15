const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').trim();

function decodeTokenPayload(token) {
  try {
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  } catch (error) {
    return null;
  }
}

function getStoredTokenForRole(preferredRole) {
  const studentToken = localStorage.getItem('spartang_student_token') || localStorage.getItem('spartang_token') || '';
  const facilitatorToken = localStorage.getItem('spartang_facilitator_token') || localStorage.getItem('spartang_token') || '';

  const studentPayload = decodeTokenPayload(studentToken);
  const facilitatorPayload = decodeTokenPayload(facilitatorToken);

  if (preferredRole === 'student') {
    if (studentPayload?.role === 'student') {
      return studentToken;
    }

    if (facilitatorPayload?.role === 'student') {
      return facilitatorToken;
    }
  }

  if (preferredRole === 'ogc') {
    if (facilitatorPayload?.role === 'ogc') {
      return facilitatorToken;
    }

    if (studentPayload?.role === 'ogc') {
      return studentToken;
    }
  }

  if (studentPayload?.role === 'student') {
    return studentToken;
  }

  if (facilitatorPayload?.role === 'ogc') {
    return facilitatorToken;
  }

  return studentToken || facilitatorToken || '';
}

function getPreferredRoleForRequest(path) {
  if (path.startsWith('/messages/conversations') || path.startsWith('/facilitator')) {
    return 'ogc';
  }

  if (path.startsWith('/messages/assigned-facilitator') || path.startsWith('/student')) {
    return 'student';
  }

  return '';
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

function formatErrorDetails(details) {
  if (!details) {
    return '';
  }

  if (Array.isArray(details)) {
    return details.filter(Boolean).join('; ');
  }

  if (typeof details === 'object') {
    return Object.values(details).flat().filter(Boolean).join('; ');
  }

  return String(details);
}

async function request(path, options = {}) {
  const token = getStoredTokenForRole(getPreferredRoleForRequest(path));
  let response;
  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (err) {
    // Network-level failure (server down, CORS blocking, DNS, etc.)
    throw new Error(`Network error: could not reach API at ${API_BASE_URL}. Check that the backend is running and CORS allows ${location.origin}`);
  }

  const contentType = response.headers.get('content-type') || '';
  let data;
  try {
    data = contentType.includes('application/json') ? await response.json() : await response.text();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const detailMessage = formatErrorDetails(data?.details);
    const message = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(detailMessage ? `${message}: ${detailMessage}` : message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' })
};

export { API_BASE_URL };