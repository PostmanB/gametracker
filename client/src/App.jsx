import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  FiCheck,
  FiPlay,
  FiRotateCcw,
  FiTrash2,
  FiPlus,
  FiPause,
} from "react-icons/fi";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import {
  createGame,
  fetchGames,
  removeGame,
  searchRawgGames,
  updateGame,
} from "./services/api";

function App() {
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const latestSearchRef = useRef(0);

  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoadingGames(true);
    try {
      const data = await fetchGames();
      setGames(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGames(false);
    }
  }

  const backlogGames = useMemo(
    () => games.filter((game) => game.status === "backlog"),
    [games]
  );
  const nowPlayingGames = useMemo(
    () => games.filter((game) => game.status === "playing"),
    [games]
  );
  const completedGames = useMemo(
    () => games.filter((game) => game.status === "completed"),
    [games]
  );
  const playedGames = useMemo(
    () => games.filter((game) => game.status === "played"),
    [games]
  );
  const statusColumns = useMemo(
    () => [
      {
        key: "backlog",
        title: "Backlog",
        games: backlogGames,
        loadingCopy: "Loading backlog...",
        emptyCopy: "Your backlog is empty. Start by adding games above.",
        accent: "#3b82f6",
      },
      {
        key: "playing",
        title: "Playing Now",
        games: nowPlayingGames,
        loadingCopy: "Loading now playing games...",
        emptyCopy:
          "No games in progress. Move one from your backlog to get started.",
        accent: "#38bdf8",
      },
      {
        key: "completed",
        title: "Completed",
        games: completedGames,
        loadingCopy: "Loading completed games...",
        emptyCopy:
          "No completed games yet. Mark one as finished to see it here.",
        accent: "#2dd4bf",
      },
      {
        key: "played",
        title: "Played",
        games: playedGames,
        loadingCopy: "Loading previously played games...",
        emptyCopy:
          "Games you dipped into but did not finish will show up here.",
        accent: "#f97316",
      },
    ],
    [backlogGames, nowPlayingGames, completedGames, playedGames]
  );

  const [activeStatus, setActiveStatus] = useState(() => {
    const defaultColumn =
      statusColumns.find((column) => column.games.length > 0) ??
      statusColumns[0];
    return defaultColumn?.key ?? "";
  });

  useEffect(() => {
    if (!statusColumns.length) {
      if (activeStatus) {
        setActiveStatus("");
      }
      return;
    }

    const hasActive = statusColumns.some(
      (column) => column.key === activeStatus
    );
    const fallback =
      statusColumns.find((column) => column.games.length > 0) ??
      statusColumns[0];

    if (!hasActive && fallback?.key) {
      setActiveStatus(fallback.key);
      return;
    }

    if (!activeStatus && fallback?.key) {
      setActiveStatus(fallback.key);
    }
  }, [activeStatus, statusColumns]);

  const existingRawgIds = useMemo(() => {
    return new Set(
      games
        .map((game) => game.rawgId)
        .filter((rawgId) => rawgId !== null && typeof rawgId !== "undefined")
        .map((rawgId) => String(rawgId))
    );
  }, [games]);

  const performSearch = useCallback(
    async (term) => {
      const trimmed = term.trim();
      if (!trimmed) {
        latestSearchRef.current += 1;
        setSearchResults([]);
        setSearching(false);
        setError("");
        return;
      }

      const requestId = latestSearchRef.current + 1;
      latestSearchRef.current = requestId;
      setSearching(true);
      try {
        const data = await searchRawgGames(trimmed, 1);
        if (latestSearchRef.current !== requestId) {
          return;
        }
        const filteredResults = (data.results || []).filter((result) => {
          if (!result || typeof result.id === "undefined") {
            return true;
          }
          return !existingRawgIds.has(String(result.id));
        });
        setSearchResults(filteredResults);
        setError("");
      } catch (err) {
        if (latestSearchRef.current === requestId) {
          setError(err.message);
        }
      } finally {
        if (latestSearchRef.current === requestId) {
          setSearching(false);
        }
      }
    },
    [existingRawgIds]
  );

  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  useEffect(() => {
    if (!searchResults.length) {
      return;
    }
    setSearchResults((prevResults) =>
      prevResults.filter((result) => {
        if (!result || typeof result.id === "undefined") {
          return true;
        }
        return !existingRawgIds.has(String(result.id));
      })
    );
  }, [existingRawgIds, searchResults.length]);

  async function handleSearch(event) {
    if (event) {
      event.preventDefault();
    }
    return performSearch(searchTerm);
  }

  async function handleAddFromRawg(game, status = "backlog") {
    const rawgId = String(game.id);
    setPendingAction(`add-${game.id}`);
    try {
      const created = await createGame({
        title: game.name,
        rawgId,
        status,
        backgroundImage: game.background_image || null,
        released: game.released || null,
      });
      setGames((prev) => [...prev, created]);
      setError("");
    } catch (err) {
      const duplicate = err.message.toLowerCase().includes("already exists");
      if (duplicate) {
        const existing = games.find((saved) => saved.rawgId === rawgId);
        if (existing) {
          await handleUpdateStatus(existing.id, status);
          setError("");
          return;
        }
      }
      setError(err.message);
    } finally {
      setPendingAction("");
    }
  }

  async function handleUpdateStatus(id, status) {
    setPendingAction(`status-${id}`);
    try {
      const updated = await updateGame(id, { status });
      setGames((prev) => prev.map((game) => (game.id === id ? updated : game)));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingAction("");
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Remove this game from your list?")) {
      return;
    }

    setPendingAction(`remove-${id}`);
    try {
      await removeGame(id);
      setGames((prev) => prev.filter((game) => game.id !== id));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingAction("");
    }
  }

  const handleStatusKeyDown = useCallback(
    (event, index) => {
      if (!statusColumns.length) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = (index + 1) % statusColumns.length;
        setActiveStatus(statusColumns[nextIndex].key);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const previousIndex =
          (index - 1 + statusColumns.length) % statusColumns.length;
        setActiveStatus(statusColumns[previousIndex].key);
      }
    },
    [statusColumns]
  );

  function renderGameCard(game) {
    const isBusy = pendingAction.includes(game.id);
    const hasArt = Boolean(game.backgroundImage);
    return (
      <article key={game.id} className="card">
        <div className={`card__media${hasArt ? "" : " card__media--empty"}`}>
          {hasArt ? (
            <img
              className="card__image"
              src={game.backgroundImage}
              alt={`${game.title} cover art`}
            />
          ) : (
            <span className="card__media-placeholder">Artwork unavailable</span>
          )}
        </div>

        <div className="card__content">
          <header className="card__header">
            <h3>{game.title}</h3>
            {game.released && (
              <span className="card__meta">Released {game.released}</span>
            )}
          </header>

          <div className="card__details">
            {game.completedAt && (
              <span className="card__meta">
                Completed {new Date(game.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <footer className="card__actions">
          {(game.status === "backlog" || game.status === "played") && (
            <button
              type="button"
              className="card__action-button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(game.id, "playing")}
              aria-label={
                game.status === "backlog" ? "Start playing" : "Resume playing"
              }
              title={
                game.status === "backlog" ? "Start playing" : "Resume playing"
              }
            >
              <FiPlay aria-hidden="true" />
            </button>
          )}
          {game.status === "playing" && (
            <button
              type="button"
              className="card__action-button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(game.id, "backlog")}
              aria-label="Move to backlog"
              title="Move to backlog"
            >
              <FiRotateCcw aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="card__action-button"
            disabled={isBusy}
            onClick={() =>
              handleUpdateStatus(
                game.id,
                game.status === "played" ? "backlog" : "played"
              )
            }
            aria-label={
              game.status === "played" ? "Move to backlog" : "Mark as played"
            }
            title={
              game.status === "played" ? "Move to backlog" : "Mark as played"
            }
          >
            {game.status === "played" ? (
              <FiRotateCcw aria-hidden="true" />
            ) : (
              <FiPause aria-hidden="true" />
            )}
          </button>
          {game.status === "completed" ? (
            <button
              type="button"
              className="card__action-button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(game.id, "backlog")}
              aria-label="Move to backlog"
              title="Move to backlog"
            >
              <FiRotateCcw aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="card__action-button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(game.id, "completed")}
              aria-label="Mark completed"
              title="Mark completed"
            >
              <FiCheck aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="card__action-button card__action-button--danger"
            disabled={isBusy}
            onClick={() => handleRemove(game.id)}
            aria-label="Remove game"
            title="Remove game"
          >
            <FiTrash2 aria-hidden="true" />
          </button>
        </footer>
      </article>
    );
  }

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__intro">
          <h1>Game Tracker</h1>
          <p>
            Track games you want to play, sync details from RAWG, and keep notes
            on what you have finished.
          </p>
        </div>
        <section className="panel panel--search">
          <h2>Search RAWG</h2>
          <form className="search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search game titles"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search games"
            />
            <button type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="search-results">
              <div className="search-results__header">
                <h3>Results</h3>
                <button type="button" onClick={() => setSearchResults([])}>
                  Clear results
                </button>
              </div>
              <ul className="search-results__list">
                {searchResults.map((result) => (
                  <li key={result.id} className="search-results__item">
                    <div>
                      <p className="search-results__title">{result.name}</p>
                      {result.released && (
                        <span className="search-results__meta">
                          Released {result.released}
                        </span>
                      )}
                    </div>
                    <div className="search-results__actions">
                      <button
                        type="button"
                        className="card__action-button"
                        disabled={pendingAction === `add-${result.id}`}
                        onClick={() => handleAddFromRawg(result, "backlog")}
                        aria-label="Add to backlog"
                        title="Add to backlog"
                      >
                        <FiPlus aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="card__action-button"
                        disabled={pendingAction === `add-${result.id}`}
                        onClick={() => handleAddFromRawg(result, "completed")}
                        aria-label="Mark completed"
                        title="Mark completed"
                      >
                        <FiCheck aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </header>

      <main className="layout__main">
        <div
          className="status-accordion"
          role="tablist"
          aria-orientation="horizontal"
        >
          {statusColumns.map((column, index) => {
            const {
              key,
              title,
              games: columnGames,
              loadingCopy,
              emptyCopy,
              accent,
            } = column;
            const isActive = key === activeStatus;
            const panelId = `status-panel-${key}`;
            const triggerId = `status-trigger-${key}`;

            return (
              <section
                key={key}
                className={`status-accordion__section${
                  isActive ? " status-accordion__section--active" : ""
                }`}
                role="presentation"
                data-status={key}
                style={{ "--status-accent": accent }}
              >
                <button
                  id={triggerId}
                  type="button"
                  className="status-accordion__trigger"
                  role="tab"
                  aria-controls={panelId}
                  aria-selected={isActive}
                  aria-expanded={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveStatus(key)}
                  onKeyDown={(event) => handleStatusKeyDown(event, index)}
                >
                  <span>{title}</span>
                  {!loadingGames && (
                    <small>
                      {columnGames.length}{" "}
                      {columnGames.length === 1 ? "game" : "games"}
                    </small>
                  )}
                </button>
                <div
                  id={panelId}
                  className={`status-accordion__panel${
                    isActive ? " status-accordion__panel--active" : ""
                  }`}
                  role="tabpanel"
                  aria-labelledby={triggerId}
                  aria-hidden={!isActive}
                >
                  {loadingGames ? (
                    <p>{loadingCopy}</p>
                  ) : columnGames.length === 0 ? (
                    <p className="empty">{emptyCopy}</p>
                  ) : (
                    <div className="cards-grid">
                      {columnGames.map((game) => renderGameCard(game))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {error && <div className="toast">{error}</div>}
    </div>
  );
}

export default App;
