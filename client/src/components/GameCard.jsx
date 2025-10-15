import { useEffect, useRef } from "react";
import {
  FiPlay,
  FiRotateCcw,
  FiPause,
  FiCheck,
  FiTrash2,
} from "react-icons/fi";

const ROTATION_RANGE = 10;
const HOVER_SCALE = "1.04";
const HOVER_LIFT = "-8px";

function shouldIgnorePointer(event) {
  return (
    event.pointerType &&
    event.pointerType !== "mouse" &&
    event.pointerType !== "pen"
  );
}

function GameCard({ game, isBusy, onUpdateStatus, onRemove }) {
  const cardRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const animateTilt = (rotateX, rotateY, hovering) => {
    const card = cardRef.current;
    if (!card) return;

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      card.style.setProperty("--hover-rotate-x", rotateX);
      card.style.setProperty("--hover-rotate-y", rotateY);
      card.style.setProperty("--hover-scale", hovering ? HOVER_SCALE : "1");
      card.style.setProperty(
        "--hover-translate-y",
        hovering ? HOVER_LIFT : "0px"
      );

      if (hovering) {
        card.dataset.hovering = "true";
      } else {
        delete card.dataset.hovering;
      }
    });
  };

  const handlePointerEnter = (event) => {
    if (shouldIgnorePointer(event)) return;
    animateTilt("0deg", "0deg", true);
  };

  const handlePointerMove = (event) => {
    if (shouldIgnorePointer(event)) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const rotateY = ((offsetX / rect.width) - 0.5) * (ROTATION_RANGE * 2);
    const rotateX = (0.5 - offsetY / rect.height) * (ROTATION_RANGE * 2);

    animateTilt(`${rotateX.toFixed(2)}deg`, `${rotateY.toFixed(2)}deg`, true);
  };

  const resetTilt = () => {
    animateTilt("0deg", "0deg", false);
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      resetTilt();
    }
  };

  const hasArt = Boolean(game.backgroundImage);

  return (
    <article
      ref={cardRef}
      className="card"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onBlur={handleBlur}
    >
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
            onClick={() => onUpdateStatus(game.id, "playing")}
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
            onClick={() => onUpdateStatus(game.id, "backlog")}
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
            onUpdateStatus(
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
            onClick={() => onUpdateStatus(game.id, "backlog")}
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
            onClick={() => onUpdateStatus(game.id, "completed")}
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
          onClick={() => onRemove(game.id)}
          aria-label="Remove game"
          title="Remove game"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

export default GameCard;
