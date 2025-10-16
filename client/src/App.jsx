import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import GameCard from "./components/GameCard";
import { FiCheck, FiPlus } from "react-icons/fi";
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
  const statusAccordionRef = useRef(null);
  const sectionRefs = useRef(new Map());
  const programmaticScrollRef = useRef(false);
  const scrollResetTimeoutRef = useRef(0);
  const hasInitialScrollRef = useRef(false);

  const [pendingAction, setPendingAction] = useState("");
  const [isSliderViewport, setIsSliderViewport] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const sortedGames = useMemo(() => {
    const toTimestamp = (game) => {
      if (!game) {
        return 0;
      }
      const created = game.createdAt ? Date.parse(game.createdAt) : NaN;
      if (!Number.isNaN(created)) {
        return created;
      }
      const updated = game.updatedAt ? Date.parse(game.updatedAt) : NaN;
      if (!Number.isNaN(updated)) {
        return updated;
      }
      return 0;
    };

    return [...games].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }, [games]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 1024px)");
    const updateMatch = (event) => {
      setIsSliderViewport(event.matches);
    };

    updateMatch(media);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMatch);
    } else {
      media.addListener(updateMatch);
    }

    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", updateMatch);
      } else {
        media.removeListener(updateMatch);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSliderViewport) {
      hasInitialScrollRef.current = false;
    }
  }, [isSliderViewport]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && scrollResetTimeoutRef.current) {
        window.clearTimeout(scrollResetTimeoutRef.current);
        scrollResetTimeoutRef.current = 0;
      }
    };
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
    () => sortedGames.filter((game) => game.status === "backlog"),
    [sortedGames]
  );
  const nowPlayingGames = useMemo(
    () => sortedGames.filter((game) => game.status === "playing"),
    [sortedGames]
  );
  const completedGames = useMemo(
    () => sortedGames.filter((game) => game.status === "completed"),
    [sortedGames]
  );
  const playedGames = useMemo(
    () => sortedGames.filter((game) => game.status === "played"),
    [sortedGames]
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

  const trackerStats = useMemo(() => {
    const statuses = statusColumns.map((column) => ({
      key: column.key,
      label: column.title,
      count: column.games.length,
      accent: column.accent,
    }));

    return {
      total: games.length,
      statuses,
    };
  }, [games.length, statusColumns]);

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
          console.error("Search failed:", err);
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

  const setSectionRef = useCallback((key, node) => {
    if (node) {
      sectionRefs.current.set(key, node);
    } else {
      sectionRefs.current.delete(key);
    }
  }, []);

  const scrollToStatus = useCallback(
    (statusKey, { behavior = "smooth" } = {}) => {
      if (!statusKey || !isSliderViewport) {
        return;
      }

      const container = statusAccordionRef.current;
      const section = sectionRefs.current.get(statusKey);

      if (!container || !section) {
        return;
      }

      let desiredBehavior = behavior;
      if (behavior !== "instant" && !hasInitialScrollRef.current) {
        desiredBehavior = "instant";
      }

      hasInitialScrollRef.current = true;
      programmaticScrollRef.current = true;

      section.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: desiredBehavior,
      });

      const timeoutDuration = desiredBehavior === "smooth" ? 420 : 120;

      if (typeof window !== "undefined") {
        if (scrollResetTimeoutRef.current) {
          window.clearTimeout(scrollResetTimeoutRef.current);
        }

        scrollResetTimeoutRef.current = window.setTimeout(() => {
          programmaticScrollRef.current = false;
          scrollResetTimeoutRef.current = 0;
        }, timeoutDuration);
      }
    },
    [isSliderViewport]
  );

  useEffect(() => {
    if (!isSliderViewport || !activeStatus) {
      return;
    }

    const hasActiveColumn = statusColumns.some(
      (column) => column.key === activeStatus
    );

    if (!hasActiveColumn) {
      return;
    }

    scrollToStatus(activeStatus);
  }, [activeStatus, isSliderViewport, scrollToStatus, statusColumns]);

  useEffect(() => {
    if (typeof window === "undefined" || !isSliderViewport) {
      return undefined;
    }

    const container = statusAccordionRef.current;
    if (!container) {
      return undefined;
    }

    const getSections = () =>
      statusColumns
        .map((column) => ({
          key: column.key,
          node: sectionRefs.current.get(column.key),
        }))
        .filter((item) => Boolean(item.node));

    let ticking = false;

    const handleScroll = () => {
      if (programmaticScrollRef.current) {
        return;
      }

      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;

        const sections = getSections();
        if (!sections.length) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        let nextKey = sections[0].key;
        let closestDistance = Number.POSITIVE_INFINITY;

        sections.forEach(({ key, node }) => {
          const rect = node.getBoundingClientRect();
          const sectionCenter = rect.left + rect.width / 2;
          const distance = Math.abs(sectionCenter - containerCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            nextKey = key;
          }
        });

        if (nextKey && nextKey !== activeStatus) {
          setActiveStatus(nextKey);
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isSliderViewport, statusColumns, activeStatus]);

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
          <div className="search__layout">
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
            <div className="search__stats" aria-label="Tracker summary">
              <dl className="search__stats-grid">
                <div
                  className="search__stat search__stat--total"
                  style={{ "--stat-accent": "#6366f1" }}
                >
                  <dt className="search__stat-label">Tracked Games</dt>
                  <dd className="search__stat-value">{trackerStats.total}</dd>
                </div>
                {trackerStats.statuses.map((stat) => (
                  <div
                    key={stat.key}
                    className="search__stat"
                    style={{ "--stat-accent": stat.accent }}
                  >
                    <dt className="search__stat-label">{stat.label}</dt>
                    <dd className="search__stat-value">{stat.count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
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
          ref={statusAccordionRef}
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
                ref={(node) => setSectionRef(key, node)}
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
                  {isActive && !loadingGames && (
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
                      {columnGames.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          isBusy={pendingAction.includes(game.id)}
                          onUpdateStatus={handleUpdateStatus}
                          onRemove={handleRemove}
                        />
                      ))}
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
