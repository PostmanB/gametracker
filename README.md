Game Tracker

React + Express app that helps you keep track of games you want to play and the ones you have already completed. The backend integrates with the [RAWG](https://rawg.io/apidocs) database so you can search for game details while building your list.

## Prerequisites

- Node.js 18+
- A RAWG API key (free tier available)

## Getting Started

1. **Install dependencies**

   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```

2. **Configure environment**

   - Copy `server/.env.example` to `server/.env`
   - Set your `RAWG_API_KEY`

3. **Run the backend**

   ```bash
   cd server
   npm run dev
   ```

   The API runs on `http://localhost:4000` with endpoints under `/api`.

4. **Run the frontend**
   ```bash
   cd client
   npm run dev
   ```
   Vite starts the React app on `http://localhost:5173` and proxies `/api` requests to the Express server.

## Features

- Search the RAWG catalogue and add games to your backlog or completed list
- Manually add titles when RAWG data is unavailable
- Keep lightweight notes per game and switch statuses between backlog, playing, and completed
- Simple JSON storage (`server/data/games.json`) for a persistence layer you can audit easily

## Project Structure

```
.
+-- client/   # React app (Vite)
+-- server/   # Express API with RAWG integration
```

Feel free to extend this setup with a real database, authentication, or additional metadata as your needs grow.
