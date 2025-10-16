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
      card.style.setProperty(
        "--hover-translate-y",
        hovering ? HOVER_LIFT : "0px"
      );
      card.style.setProperty("--hover-scale", hovering ? HOVER_SCALE : "1");

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

    const rotateY = (offsetX / rect.width - 0.5) * (ROTATION_RANGE * 2);
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
  const iconButtonBase =
    "inline-flex h-9 w-12 items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-500/20 text-indigo-100 transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(99,102,241,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none";
  const dangerButtonStyles =
    "border-rose-500/40 bg-rose-500/20 text-rose-100 hover:shadow-[0_12px_26px_rgba(244,63,94,0.35)]";

  return (
    <article
      ref={cardRef}
      className="group relative flex min-h-[420px] flex-col rounded-2xl border border-slate-500/30 bg-slate-900/85 p-5 shadow-[0_22px_38px_rgba(15,23,42,0.45)] transition-[transform,box-shadow,border-color] duration-[450ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] focus-within:border-slate-400/40 focus-within:shadow-[0_24px_46px_rgba(15,23,42,0.5)] data-[hovering=true]:border-slate-400/40 data-[hovering=true]:shadow-[0_26px_52px_rgba(15,23,42,0.56)]"
      style={{
        "--hover-rotate-x": "0deg",
        "--hover-rotate-y": "0deg",
        "--hover-translate-y": "0px",
        "--hover-scale": "1",
        transform:
          "perspective(1100px) rotateX(var(--hover-rotate-x)) rotateY(var(--hover-rotate-y)) translateY(var(--hover-translate-y)) scale3d(var(--hover-scale), var(--hover-scale), var(--hover-scale))",
        willChange: "transform",
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onBlur={handleBlur}
    >
      <div
        className={`relative -mx-5 mb-5 flex h-[190px] items-center justify-center overflow-hidden rounded-t-xl border-b border-slate-500/30 ${
          hasArt
            ? "bg-gradient-to-br from-teal-300/10 to-indigo-500/10"
            : "bg-gradient-to-br from-slate-800/90 to-slate-900/95"
        }`}
      >
        {hasArt ? (
          <>
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={game.backgroundImage}
              alt={`${game.title} cover art`}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent"
            />
          </>
        ) : (
          <span className="text-sm text-slate-400">Artwork unavailable</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold leading-tight text-slate-100">
            {game.title}
          </h3>
          {game.released && (
            <span className="text-sm text-slate-400">
              Released {game.released}
            </span>
          )}
        </header>

        <div className="flex flex-col gap-2 text-sm text-slate-400">
          {game.completedAt && (
            <span>
              Completed {new Date(game.completedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <footer className="mt-auto flex w-full items-center justify-center gap-2 pt-4">
        {(game.status === "backlog" || game.status === "played") && (
          <button
            type="button"
            className={iconButtonBase}
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
            className={iconButtonBase}
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
          className={iconButtonBase}
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
            className={iconButtonBase}
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
            className={iconButtonBase}
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
          className={`${iconButtonBase} ${dangerButtonStyles}`}
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
