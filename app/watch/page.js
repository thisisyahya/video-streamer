"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Pusher from "pusher-js";

const MOVIE_PATCHES = [
  "https://res.cloudinary.com/dya1qiyel/video/upload/v1792324200/spider-man/part_001.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324233/spider-man/part_002.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324284/spider-man/part_003.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324339/spider-man/part_004.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324385/spider-man/part_005.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324442/spider-man/part_006.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324501/spider-man/part_007.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324564/spider-man/part_008.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324619/spider-man/part_009.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324682/spider-man/part_010.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324736/spider-man/part_011.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324789/spider-man/part_012.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324840/spider-man/part_013.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324895/spider-man/part_014.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792324964/spider-man/part_015.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325018/spider-man/part_016.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325076/spider-man/part_017.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325148/spider-man/part_018.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325182/spider-man/part_019.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325227/spider-man/part_020.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325273/spider-man/part_021.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792325317/spider-man/part_022.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327440/spider-man/part_023.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327513/spider-man/part_024.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327579/spider-man/part_025.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327630/spider-man/part_026.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327673/spider-man/part_027.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327719/spider-man/part_028.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327778/spider-man/part_029.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327811/spider-man/part_030.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327851/spider-man/part_031.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327905/spider-man/part_032.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792327969/spider-man/part_033.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328056/spider-man/part_034.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328094/spider-man/part_035.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328141/spider-man/part_036.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328213/spider-man/part_037.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328275/spider-man/part_038.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328335/spider-man/part_039.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328393/spider-man/part_040.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328454/spider-man/part_041.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328513/spider-man/part_042.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328564/spider-man/part_043.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328625/spider-man/part_044.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328670/spider-man/part_045.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328736/spider-man/part_046.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328775/spider-man/part_047.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328836/spider-man/part_048.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328894/spider-man/part_049.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792328935/spider-man/part_050.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792329008/spider-man/part_051.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792329053/spider-man/part_052.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792329096/spider-man/part_053.mp4",
"https://res.cloudinary.com/dya1qiyel/video/upload/v1792329125/spider-man/part_054.mp4"
];

export default function PatchMoviePlayer() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const [currentPatchIdx, setCurrentPatchIdx] = useState(0);
  const [activePlayer, setActivePlayer] = useState("A");
  const [, setStatus] = useState("Loading video...");

  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const playerContainerRef = useRef(null);

  const patchRef = useRef(0);
  const activeRef = useRef("A");
  const syncingRef = useRef(false);
  const pendingRemoteRef = useRef(null);
  const pendingTransitionRef = useRef(null);
  const transitionBusyRef = useRef(false);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // Keep current values available to asynchronous event handlers.
  patchRef.current = currentPatchIdx;
  activeRef.current = activePlayer;

  const nextPatchIdx =
    currentPatchIdx + 1 < MOVIE_PATCHES.length ? currentPatchIdx + 1 : null;

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
        ? event.time +
          Math.max(0, Date.now() - event.serverTimestamp) / 1000
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

  // Complete a patch transition only when the next video has data.
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

        // Start the next patch before switching visibility.
        await video.play();

        activeRef.current = pending.player;
        patchRef.current = pending.patchIndex;

        setActivePlayer(pending.player);
        setCurrentPatchIdx(pending.patchIndex);
        setStatus("Playing");

        await sendSyncEvent("play", 0, pending.patchIndex);
      } catch (error) {
        console.error("Patch transition failed:", error);
        setStatus("Next patch could not start. Press Play to retry.");
      } finally {
        transitionBusyRef.current = false;
      }
    },
    [getInactiveVideo, sendSyncEvent]
  );

  const handlePatchEnded = useCallback(
    (event) => {
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
    },
    [completeTransition, getActiveVideo, getInactiveVideo,isAdmin]
  );

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

      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [applyRemoteEvent, getActiveVideo]);

  // // Autoplay on wide screens only (768px and up).
  // useEffect(() => {
  //   const isWide = window.matchMedia("(min-width: 768px)").matches;
  //   if (!isWide) return;

  //   const video = activePlayer === "A" ? videoRefA.current : videoRefB.current;
  //   if (!video) return;

  //   const startPlayback = async () => {
  //     try {
  //       video.muted = false;
  //       await video.play();
  //     } catch {
  //       // Browsers block unmuted autoplay until the user interacts with the page,
  //       // so fall back to muted playback.
  //       video.muted = true;
  //       video.play().catch(() => {});
  //     }
  //   };

  //   if (video.readyState >= 2) {
  //     startPlayback();
  //     return;
  //   }

  //   video.addEventListener("canplay", startPlayback, { once: true });
  //   return () => video.removeEventListener("canplay", startPlayback);
  // }, [activePlayer, sourceA, sourceB]);

  // Click handler: enter fullscreen and start playback with sound.
const enterFullscreen = async () => {
  const video = getActiveVideo();
  const container = playerContainerRef.current;

  if (!video) return;

  // Only the admin can start playback.
  if (isAdmin && video.paused) {
    video.muted = false;
    video.play().catch(() => {});
  }

  if (document.fullscreenElement) return;

  try {
    if (container?.requestFullscreen) {
      await container.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  } catch {
    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }
};

  
const handlePlay = (event) => {
  const video = event.currentTarget;

  if (video !== getActiveVideo()) return;

  // Block playback initiated locally by non-admins.
  // Remote admin commands set syncingRef.current to true.
  if (!isAdmin && !syncingRef.current) {
    video.pause();
    return;
  }

  setStatus("Playing");

  if (isAdmin && !syncingRef.current) {
    sendSyncEvent("play", video.currentTime, patchRef.current);
  }
};

  const handlePause = (event) => {
    const video = event.currentTarget;

    if (video !== getActiveVideo()) return;
    // Only the admin advances patches locally.
if (!isAdmin) return;

    if (!video.ended) setStatus("Paused");

    if (isAdmin && !syncingRef.current && !video.ended) {
      sendSyncEvent("pause", video.currentTime, patchRef.current);
    }
  };

  // Avoid a flash of no-controls before the session finishes loading.
  if (sessionStatus === "loading") {
    return <div className="fixed inset-0 bg-black" />;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div
        ref={playerContainerRef}
        onClick={enterFullscreen}
        className="relative h-full w-full bg-black"
      >
        <video
          ref={videoRefA}
          src={sourceA || undefined}
          controls={isAdmin && activePlayer === "A"}
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
          controls={isAdmin && activePlayer === "B"}
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
      </div>
    </div>
  );
}