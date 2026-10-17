
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";

const MOVIE_PATCHES = [
    "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260763/random/part_001.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260765/random/part_002.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260767/random/part_003.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260774/random/part_004.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260779/random/part_005.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260783/random/part_006.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260789/random/part_007.mp4"
];

export default function PatchMoviePlayer() {
  const [currentPatchIdx, setCurrentPatchIdx] = useState(0);
  const [activePlayer, setActivePlayer] = useState("A");
  const [status, setStatus] = useState("Loading video...");

  const videoRefA = useRef(null);
  const videoRefB = useRef(null);

  const patchRef = useRef(0);
  const activeRef = useRef("A");
  const syncingRef = useRef(false);
  const pendingRemoteRef = useRef(null);
  const pendingTransitionRef = useRef(null);
  const transitionBusyRef = useRef(false);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const syncTimerRef = useRef(null);

  // Keep current values available to asynchronous event handlers.
  patchRef.current = currentPatchIdx;
  activeRef.current = activePlayer;

  const nextPatchIdx =
    currentPatchIdx + 1 < MOVIE_PATCHES.length
      ? currentPatchIdx + 1
      : null;

  // The active player owns the current patch.
  // The inactive player preloads the next patch.
  const sourceA =
    activePlayer === "A"
      ? MOVIE_PATCHES[currentPatchIdx]
      : nextPatchIdx !== null
        ? MOVIE_PATCHES[nextPatchIdx]
        : "";

  const sourceB =
    activePlayer === "B"
      ? MOVIE_PATCHES[currentPatchIdx]
      : nextPatchIdx !== null
        ? MOVIE_PATCHES[nextPatchIdx]
        : "";

  const getActiveVideo = useCallback(() => {
    return activeRef.current === "A"
      ? videoRefA.current
      : videoRefB.current;
  }, []);

  const getInactiveVideo = useCallback(() => {
    return activeRef.current === "A"
      ? videoRefB.current
      : videoRefA.current;
  }, []);



  const sendSyncEvent = useCallback(async (action, time, patchIndex) => {
  if (syncingRef.current) return;

  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        time,
        patchIndex,
        socketId: pusherRef.current?.connection?.socket_id,
      }),
    });

    if (!response.ok) {
      console.error("Sync failed:", await response.text());
    }
  } catch (error) {
    console.error("Sync request failed:", error);
  }
}, []);



 const applyRemoteEvent = useCallback((video, event) => {
  if (!video || video.readyState < 1) return false;

  syncingRef.current = true;

  const targetTime =
    event.action === "play" && event.serverTimestamp
      ? event.time +
        Math.max(0, Date.now() - event.serverTimestamp) / 1000
      : event.time;

  const safeTarget = Math.min(
    targetTime,
    Number.isFinite(video.duration)
      ? video.duration
      : targetTime
  );

  if (Math.abs(video.currentTime - safeTarget) > 0.35) {
    video.currentTime = safeTarget;
  }

  if (event.action === "play") {
    video.play().catch((error) => {
      console.error("Remote playback failed:", error);
      setStatus("Press Play to allow playback.");
    });
  } else {
    video.pause();
  }

  setTimeout(() => {
    syncingRef.current = false;
  }, 1000);

  return true;
}, []);

  // Apply a remote command after the new patch has loaded.
  const handleLoadedMetadata = useCallback((event) => {
    const video = event.currentTarget;
    const pending = pendingRemoteRef.current;

    if (
      pending &&
      pending.patchIndex === patchRef.current &&
      video === getActiveVideo()
    ) {
      pendingRemoteRef.current = null;
      applyRemoteEvent(video, pending);
    }

    if (video === getActiveVideo()) {
      setStatus("Ready");
    }
  }, [applyRemoteEvent, getActiveVideo]);

  // Complete a patch transition only when the next video has data.
  const completeTransition = useCallback(async (video) => {
    const pending = pendingTransitionRef.current;

    if (
      !pending ||
      transitionBusyRef.current ||
      video !== getInactiveVideo() ||
      video.readyState < 2
    ) {
      return;
    }

    transitionBusyRef.current = true;
    pendingTransitionRef.current = null;

    try {
      video.currentTime = 0;

      // Start the next patch before switching visibility.
      await video.play();

      activeRef.current = pending.player;
      patchRef.current = pending.patchIndex;

      setActivePlayer(pending.player);
      setCurrentPatchIdx(pending.patchIndex);
      setStatus("Playing");

      await sendSyncEvent(
        "play",
        0,
        pending.patchIndex
      );
    } catch (error) {
      console.error("Patch transition failed:", error);
      setStatus("Next patch could not start. Press Play to retry.");
    } finally {
      transitionBusyRef.current = false;
    }
  }, [getInactiveVideo, sendSyncEvent]);

  const handlePatchEnded = useCallback((event) => {
    const video = event.currentTarget;

    // Ignore ended events from the hidden/preloading player.
    if (video !== getActiveVideo()) return;

    const nextIdx = patchRef.current + 1;

    if (nextIdx >= MOVIE_PATCHES.length) {
      setStatus("Movie finished");
      return;
    }

    const nextPlayer = activeRef.current === "A" ? "B" : "A";

    pendingTransitionRef.current = {
      player: nextPlayer,
      patchIndex: nextIdx,
    };

    const nextVideo = getInactiveVideo();

    if (nextVideo?.readyState >= 2) {
      completeTransition(nextVideo);
    } else {
      setStatus("Preparing next patch...");
    }
  }, [completeTransition, getActiveVideo, getInactiveVideo]);

  // Subscribe once to Pusher.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      setStatus("Missing Pusher configuration");
      return;
    }

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe("movie-room");

    pusherRef.current = pusher;
    channelRef.current = channel;

    const handleSync = (data) => {
      if (
        !Number.isInteger(data.patchIndex) ||
        data.patchIndex < 0 ||
        data.patchIndex >= MOVIE_PATCHES.length ||
        !["play", "pause"].includes(data.action) ||
        typeof data.time !== "number" ||
        !Number.isFinite(data.time) ||
        data.time < 0
      ) {
        return;
      }

      // Ignore our own events when handling local playback.
      // The current backend does not identify the event sender,
      // so local events are suppressed briefly by the guard.
      if (syncingRef.current) return;

      const video = getActiveVideo();

      if (!video) return;

      if (data.patchIndex !== patchRef.current) {
        pendingRemoteRef.current = data;

        patchRef.current = data.patchIndex;
        setCurrentPatchIdx(data.patchIndex);
        setStatus("Synchronizing video...");
        return;
      }

      if (video.readyState >= 1) {
        applyRemoteEvent(video, data);
      } else {
        pendingRemoteRef.current = data;
      }
    };

    channel.bind("sync-event", handleSync);

    return () => {
      channel.unbind("sync-event", handleSync);
      pusher.unsubscribe("movie-room");
      pusher.disconnect();

      clearTimeout(syncTimerRef.current);

      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [applyRemoteEvent, getActiveVideo]);

  const handlePlay = (event) => {
    const video = event.currentTarget;

    if (video !== getActiveVideo()) return;

    setStatus("Playing");

    if (!syncingRef.current) {
      sendSyncEvent("play", video.currentTime, patchRef.current);
    }
  };

  const handlePause = (event) => {
    const video = event.currentTarget;

    if (video !== getActiveVideo()) return;

    if (!video.ended) {
      setStatus("Paused");
    }

    if (!syncingRef.current && !video.ended) {
      sendSyncEvent("pause", video.currentTime, patchRef.current);
    }
  };

return (
 
<main className="relative min-h-screen w-full overflow-hidden bg-[#080808] text-white selection:bg-red-600">
  {/* Cinematic background */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-red-700/15 blur-[150px]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/50 to-[#080808]" />
  </div>

  {/* Header */}
  <header className="fixed inset-x-0 top-0 z-30 border-b border-white/[0.07] bg-black/75 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-lg font-black tracking-tight">
          CO<span className="text-red-500">WATCH</span>
        </span>
      </div>

      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
        {status}
      </span>
    </div>
  </header>

  <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-28 sm:px-8 sm:pt-36">
    {/* Film information */}
    <section className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        <span className="text-red-500">Marvel Studios</span>
        <span>•</span>
        <span>2026</span>
        <span>•</span>
        <span>Action / Adventure / Sci-Fi</span>
      </div>

      <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
        Spider-Man:
        <span className="block text-red-500">Brand New Day</span>
      </h1>

      <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
        The world has forgotten Peter Parker, but Spider-Man still has a city
        to protect. Living alone and fighting crime full-time, Peter faces a
        dangerous new threat as the pressure of his double life triggers a
        transformation he may not be able to control. With old relationships
        changed and new enemies emerging, he must discover what being a hero
        means when nobody remembers the person behind the mask.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded border border-white/15 px-2 py-1 text-xs text-zinc-300">
          PG-13
        </span>
        <span className="text-zinc-400">2h 25m</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-300">Tom Holland</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-300">Zendaya</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-300">Jacob Batalon</span>
      </div>

      {/* Ratings */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a
          href="https://www.rottentomatoes.com/m/spider_man_brand_new_day"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-red-500/40 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold text-zinc-400">Rotten Tomatoes</p>
          <p className="mt-2 text-3xl font-black text-red-500">90%</p>
          <p className="mt-1 text-xs text-zinc-500">Critics score</p>
        </a>

        <a
          href="https://www.rottentomatoes.com/m/spider_man_brand_new_day"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-red-500/40 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold text-zinc-400">Audience score</p>
          <p className="mt-2 text-3xl font-black text-red-400">97%</p>
          <p className="mt-1 text-xs text-zinc-500">Rotten Tomatoes</p>
        </a>

        <a
          href="https://www.imdb.com/title/tt22084616/"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-red-500/40 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold text-zinc-400">IMDb rating</p>
          <p className="mt-2 text-3xl font-black text-amber-400">8.0<span className="text-base text-zinc-500">/10</span></p>
          <p className="mt-1 text-xs text-zinc-500">IMDb users</p>
        </a>
      </div>

      {/* Selected critic reviews */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold sm:text-xl">What critics are saying</h2>
          <a
            href="https://editorial.rottentomatoes.com/article/spider-man-brand-new-day-first-reviews/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-red-400 transition hover:text-red-300"
          >
            Read reviews ↗
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm leading-6 text-zinc-300">
              “An emotionally stirring, dynamically directed Spider-Man movie”
            </p>
            <p className="mt-4 text-xs font-semibold text-white">Hoai-Tran Bui</p>
            <p className="mt-1 text-xs text-zinc-500">Inverse</p>
          </article>

          <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm leading-6 text-zinc-300">
              “A remarkably coherent, often joyful film”
            </p>
            <p className="mt-4 text-xs font-semibold text-white">Liz Shannon Miller</p>
            <p className="mt-1 text-xs text-zinc-500">Consequence</p>
          </article>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-600">
          Review excerpts sourced from Rotten Tomatoes' published critics roundup.
          Ratings and opinions belong to their respective publishers.
        </p>
      </div>
    </section>

    {/* Video player at the bottom */}
    <section className="mt-12 sm:mt-16">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Now Playing</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Spider-Man: Brand New Day
          </p>
        </div>
        <span className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-400">
          Patch {currentPatchIdx + 1} / {MOVIE_PATCHES.length}
        </span>
      </div>

      <div className="group relative">
        <div className="absolute -inset-px rounded-2xl bg-red-600/20 opacity-70 blur-md transition group-hover:opacity-100" />
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black p-1.5 sm:p-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRefA}
              src={sourceA || undefined}
              controls={activePlayer === "A"}
              playsInline
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={(event) => completeTransition(event.currentTarget)}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handlePatchEnded}
              className={`absolute inset-0 h-full w-full object-contain ${
                activePlayer === "A"
                  ? "visible"
                  : "invisible pointer-events-none"
              }`}
            />

            <video
              ref={videoRefB}
              src={sourceB || undefined}
              controls={activePlayer === "B"}
              playsInline
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={(event) => completeTransition(event.currentTarget)}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handlePatchEnded}
              className={`absolute inset-0 h-full w-full object-contain ${
                activePlayer === "B"
                  ? "visible"
                  : "invisible pointer-events-none"
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</main>

);
}