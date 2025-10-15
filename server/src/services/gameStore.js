import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '..', '..', 'data', 'games.json');

async function readGames() {
  try {
    const raw = await readFile(dataPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(dataPath, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

async function writeGames(games) {
  await writeFile(dataPath, JSON.stringify(games, null, 2), 'utf-8');
}

export async function getAllGames() {
  return readGames();
}

export async function addGame({ title, rawgId, status = 'backlog', notes = '', rating = null, backgroundImage = null, released = null }) {
  if (!title) {
    const error = new Error('Title is required');
    error.status = 400;
    throw error;
  }

  const games = await readGames();
  const now = new Date().toISOString();

  const duplicate = games.find((game) => {
    if (rawgId && game.rawgId) {
      return game.rawgId === rawgId;
    }
    return game.title.toLowerCase() === title.toLowerCase();
  });

  if (duplicate) {
    const error = new Error('Game already exists in your tracker');
    error.status = 409;
    throw error;
  }

  const newGame = {
    id: uuid(),
    rawgId: rawgId || null,
    title,
    status,
    notes,
    rating,
    backgroundImage,
    released,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : null,
  };

  games.push(newGame);
  await writeGames(games);
  return newGame;
}

export async function updateGame(id, updates) {
  const games = await readGames();
  const index = games.findIndex((game) => game.id === id);

  if (index === -1) {
    const error = new Error('Game not found');
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const allowedFields = ['title', 'status', 'notes', 'rating', 'backgroundImage', 'released'];
  const updatedGame = { ...games[index] };

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      updatedGame[field] = updates[field];
    }
  }

  if (updates.status && updates.status === 'completed' && !updatedGame.completedAt) {
    updatedGame.completedAt = now;
  } else if (updates.status && updates.status !== 'completed') {
    updatedGame.completedAt = null;
  }

  updatedGame.updatedAt = now;
  games[index] = updatedGame;

  await writeGames(games);
  return updatedGame;
}

export async function deleteGame(id) {
  const games = await readGames();
  const filtered = games.filter((game) => game.id !== id);

  if (filtered.length === games.length) {
    const error = new Error('Game not found');
    error.status = 404;
    throw error;
  }

  await writeGames(filtered);
}

