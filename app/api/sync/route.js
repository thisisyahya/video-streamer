
import Pusher from "pusher";

function getPusher() {
  const required = [
    "PUSHER_APP_ID",
    "NEXT_PUBLIC_PUSHER_KEY",
    "PUSHER_SECRET",
    "NEXT_PUBLIC_PUSHER_CLUSTER",
  ];

  const missing = required.filter(
    (name) => !process.env[name]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });
}

export async function POST(request) {
  try {
    const { action, time, patchIndex, socketId } =
      await request.json();

    // Validate request data.
    if (!["play", "pause"].includes(action)) {
      return Response.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (
      typeof time !== "number" ||
      !Number.isFinite(time) ||
      time < 0
    ) {
      return Response.json(
        { error: "Invalid playback time" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(patchIndex) ||
      patchIndex < 0 ||
      patchIndex > 2
    ) {
      return Response.json(
        { error: "Invalid patch index" },
        { status: 400 }
      );
    }

    // Exclude the originating browser when possible.
    const options =
      typeof socketId === "string" &&
      /^[0-9]+\.[0-9]+$/.test(socketId)
        ? { socket_id: socketId }
        : {};

    const pusher = getPusher();

    console.log("[SYNC] Publishing:", {
      action,
      time,
      patchIndex,
    });

    const result = await pusher.trigger(
      "movie-room",
      "sync-event",
      {
        action,
        time,
        patchIndex,
        serverTimestamp: Date.now(),
      },
      options
    );

    console.log("[SYNC] Pusher result:", result);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[SYNC API ERROR]", error);

    return Response.json(
      {
        error: "Failed to broadcast sync event",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
