import { Router } from 'express';
import { addGame, deleteGame, getAllGames, updateGame } from '../services/gameStore.js';
import { fetchGameDetails, searchGames } from '../services/rawgClient.js';

const router = Router();

router.get('/games', async (_req, res, next) => {
  try {
    const games = await getAllGames();
    res.json(games);
  } catch (error) {
    next(error);
  }
});

router.post('/games', async (req, res, next) => {
  try {
    const { title, rawgId, status, notes, rating, backgroundImage, released } = req.body || {};
    const game = await addGame({ title, rawgId, status, notes, rating, backgroundImage, released });
    res.status(201).json(game);
  } catch (error) {
    next(error);
  }
});

router.patch('/games/:id', async (req, res, next) => {
  try {
    const updated = await updateGame(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/games/:id', async (req, res, next) => {
  try {
    await deleteGame(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/rawg/search', async (req, res, next) => {
  try {
    const { query, page } = req.query;
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const results = await searchGames(query, pageNumber);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/rawg/games/:id', async (req, res, next) => {
  try {
    const game = await fetchGameDetails(req.params.id);
    res.json(game);
  } catch (error) {
    next(error);
  }
});

export default router;

