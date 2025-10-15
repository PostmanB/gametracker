const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function fetchGames() {
  return request('/games');
}

export function createGame(payload) {
  return request('/games', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateGame(id, payload) {
  return request(`/games/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeGame(id) {
  return request(`/games/${id}`, {
    method: 'DELETE',
  });
}

export function searchRawgGames(query, page = 1, init = {}) {
  const params = new URLSearchParams({ query, page: String(page) });
  return request(`/rawg/search?${params.toString()}`, init);
}

export function fetchRawgGameDetails(id, init = {}) {
  return request(`/rawg/games/${id}`, init);
}
