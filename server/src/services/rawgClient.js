import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.rawg.io/api',
  timeout: 10000,
});

function requireApiKey() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    const error = new Error('RAWG API key is not configured. Set RAWG_API_KEY in your environment.');
    error.status = 500;
    throw error;
  }
  return apiKey;
}

export async function searchGames(query, page = 1) {
  if (!query) {
    const error = new Error('Query parameter is required');
    error.status = 400;
    throw error;
  }

  const apiKey = requireApiKey();

  const response = await client.get('/games', {
    params: {
      key: apiKey,
      search: query,
      page,
      page_size: 20,
    },
  });

  return response.data;
}

export async function fetchGameDetails(gameId) {
  if (!gameId) {
    const error = new Error('Game id is required');
    error.status = 400;
    throw error;
  }

  const apiKey = requireApiKey();
  const response = await client.get(`/games/${gameId}`, {
    params: {
      key: apiKey,
    },
  });

  return response.data;
}
