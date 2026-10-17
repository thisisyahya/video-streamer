"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

const MOVIE_PATCHES = [
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260763/random/part_001.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260765/random/part_002.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260767/random/part_003.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260774/random/part_004.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260779/random/part_005.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260783/random/part_006.mp4",
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792260789/random/part_007.mp4",
];

export default function PatchMoviePlayer() {
  const router = useRouter();

  const [currentPatchIdx, setCurrentPatchIdx] = useState(0);
  const [activePlayer, setActivePlayer] = useState("A");
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setStatus] = useState("");

  const containerRef = useRef(null);
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);

  const patchRef = useRef(0);
  const activeRef = useRef("A");
  const syncingRef = useRef(false);
  const pendingRemoteRef = useRef(null);
  const pendingTransitionRef = useRef(null);
  const transitionBusyRef = useRef(false);
  const pusherRef = useRef(null);

  patchRef.current = currentPatchIdx;
  activeRef.current = activePlayer;

  const nextPatchIdx =
    currentPatchIdx + 1 < MOVIE_PATCHES.length ? currentPatchIdx + 1 : null;

  // The active player plays the current patch.
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
    return activeRef.current === "A" ? videoRefA.current : videoRefB.current;
  }, []);

  const getInactiveVideo = useCallback(() => {
    return activeRef.current === "A" ? videoRefB.current : videoRefA.current;
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
        ? event.time + Math.max(0, Date.now() - event.serverTimestamp) / 1000
        : event.time;

    const safeTarget = Math.min(
      targetTime,
      Number.isFinite(video.duration) ? video.duration : targetTime
    );

    if (Math.abs(video.currentTime - safeTarget) > 0.35) {
      video.currentTime = safeTarget;
    }

    if (event.action === "play") {
      video.play().catch((error) => {
        console.error("Remote playback failed:", error);
      });
    }

    setTimeout(() => {
      syncingRef.current = false;
    }, 1000);

    return true;
  }, []);

  const handleLoadedMetadata = useCallback(
    (event) => {
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
    },
    [applyRemoteEvent, getActiveVideo]
  );

  // Switch to the preloaded patch once it has enough data.
  const completeTransition = useCallback(
    async (video) => {
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
        await video.play();

        activeRef.current = pending.player;
        patchRef.current = pending.patchIndex;

        setActivePlayer(pending.player);
        setCurrentPatchIdx(pending.patchIndex);
        setStatus("Playing");

        await sendSyncEvent("play", 0, pending.patchIndex);
      } catch (error) {
        console.error("Patch transition failed:", error);
      } finally {
        transitionBusyRef.current = false;
      }
    },
    [getInactiveVideo, sendSyncEvent]
  );

  const handlePatchEnded = useCallback(
    (event) => {
      const video = event.currentTarget;

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
      }
    },
    [completeTransition, getActiveVideo, getInactiveVideo]
  );

  // Pusher sync.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe("movie-room");

    pusherRef.current = pusher;

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

      if (syncingRef.current) return;

      const video = getActiveVideo();
      if (!video) return;

      if (data.patchIndex !== patchRef.current) {
        pendingRemoteRef.current = data;
        patchRef.current = data.patchIndex;
        setCurrentPatchIdx(data.patchIndex);
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
      pusherRef.current = null;
    };
  }, [applyRemoteEvent, getActiveVideo]);

  // Redirect to /movie when the player is made small (leaves fullscreen).
  useEffect(() => {
    let wasFullscreen = false;

    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (inFullscreen) {
        wasFullscreen = true;
      } else if (wasFullscreen) {
        router.push("/movie");
      }
    };

    // iPhone Safari uses its own video fullscreen, which fires this event on exit.
    const handleIosFullscreenEnd = () => router.push("/movie");

    const videos = [videoRefA.current, videoRefB.current].filter(Boolean);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    videos.forEach((v) =>
      v.addEventListener("webkitendfullscreen", handleIosFullscreenEnd)
    );

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      videos.forEach((v) =>
        v.removeEventListener("webkitendfullscreen", handleIosFullscreenEnd)
      );
    };
  }, [router]);

  // Start playback on load and after each patch change.
  useEffect(() => {
    const video = activePlayer === "A" ? videoRefA.current : videoRefB.current;
    if (!video) return;

    const start = () => {
      video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      start();
      return;
    }

    video.addEventListener("canplay", start, { once: true });
    return () => video.removeEventListener("canplay", start);
  }, [activePlayer, currentPatchIdx]);

  // Apply the mute setting to both players.
  useEffect(() => {
    if (videoRefA.current) videoRefA.current.muted = isMuted;
    if (videoRefB.current) videoRefB.current.muted = isMuted;
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Enter fullscreen on a click (browsers require a user gesture).
  const enterFullscreen = async () => {
    setIsMuted(false);

    const video = getActiveVideo();

    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }
  };

  // Make the player small: leave fullscreen and go back to /movie.
  const minimize = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore. The redirect below still runs.
      }
      // fullscreenchange also redirects, but push here so the click always works.
    }
    router.push("/movie");
  };

  // Playback cannot be paused by the viewer: resume if it stops.
  const handlePause = (event) => {
    const video = event.currentTarget;
    if (video !== getActiveVideo()) return;
    if (video.ended) return;

    video.play().catch(() => {});
  };

  const handlePlay = (event) => {
    const video = event.currentTarget;
    if (video !== getActiveVideo()) return;

    if (!syncingRef.current) {
      sendSyncEvent("play", video.currentTime, patchRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
    >
      <video
        ref={videoRefA}
        src={sourceA || undefined}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={(event) => completeTransition(event.currentTarget)}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePatchEnded}
        className={`absolute inset-0 h-full w-full object-contain ${
          activePlayer === "A" ? "visible" : "invisible pointer-events-none"
        }`}
      />

      <video
        ref={videoRefB}
        src={sourceB || undefined}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={(event) => completeTransition(event.currentTarget)}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePatchEnded}
        className={`absolute inset-0 h-full w-full object-contain ${
          activePlayer === "B" ? "visible" : "invisible pointer-events-none"
        }`}
      />

      {/* Controls: fullscreen, minimize, and audio */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white"
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M22 9l-6 6M16 9l6 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
            </svg>
          )}
        </button>

        {!isFullscreen && (
          <button
            type="button"
            onClick={enterFullscreen}
            aria-label="Full screen"
            className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={minimize}
          aria-label="Minimize"
          className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}