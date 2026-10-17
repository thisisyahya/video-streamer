
// import Pusher from "pusher";

// function getPusher() {
//   const required = [
//     "PUSHER_APP_ID",
//     "NEXT_PUBLIC_PUSHER_KEY",
//     "PUSHER_SECRET",
//     "NEXT_PUBLIC_PUSHER_CLUSTER",
//   ];

//   const missing = required.filter(
//     (name) => !process.env[name]
//   );

//   if (missing.length > 0) {
//     throw new Error(
//       `Missing environment variables: ${missing.join(", ")}`
//     );
//   }

//   return new Pusher({
//     appId: process.env.PUSHER_APP_ID,
//     key: process.env.NEXT_PUBLIC_PUSHER_KEY,
//     secret: process.env.PUSHER_SECRET,
//     cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
//     useTLS: true,
//   });
// }

// export async function POST(request) {
//   try {
//     const { action, time, patchIndex, socketId } =
//       await request.json();

//     // Validate request data.
//     if (!["play", "pause"].includes(action)) {
//       return Response.json(
//         { error: "Invalid action" },
//         { status: 400 }
//       );
//     }

//     if (
//       typeof time !== "number" ||
//       !Number.isFinite(time) ||
//       time < 0
//     ) {
//       return Response.json(
//         { error: "Invalid playback time" },
//         { status: 400 }
//       );
//     }

//     if (
//       !Number.isInteger(patchIndex) ||
//       patchIndex < 0 ||
//       patchIndex > 2
//     ) {
//       return Response.json(
//         { error: "Invalid patch index" },
//         { status: 400 }
//       );
//     }

//     // Exclude the originating browser when possible.
//     const options =
//       typeof socketId === "string" &&
//       /^[0-9]+\.[0-9]+$/.test(socketId)
//         ? { socket_id: socketId }
//         : {};

//     const pusher = getPusher();

//     console.log("[SYNC] Publishing:", {
//       action,
//       time,
//       patchIndex,
//     });

//     const result = await pusher.trigger(
//       "movie-room",
//       "sync-event",
//       {
//         action,
//         time,
//         patchIndex,
//         serverTimestamp: Date.now(),
//       },
//       options
//     );

//     console.log("[SYNC] Pusher result:", result);

//     return Response.json({ success: true });
//   } catch (error) {
//     console.error("[SYNC API ERROR]", error);

//     return Response.json(
//       {
//         error: "Failed to broadcast sync event",
//         details:
//           error instanceof Error
//             ? error.message
//             : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }



import { getToken } from "next-auth/jwt";
import Pusher from "pusher";
import { NextResponse } from "next/server";

const PATCH_COUNT = 7;

function getPusher() {
  const required = [
    "PUSHER_APP_ID",
    "NEXT_PUBLIC_PUSHER_KEY",
    "PUSHER_SECRET",
    "NEXT_PUBLIC_PUSHER_CLUSTER",
  ];

  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
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
    // 1. Verify the NextAuth JWT session.
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Authorize the admin using the verified Google ID.
    const adminGoogleId = process.env.ADMIN_GOOGLE_ID;
    const googleId = token.googleId;

    if (
      !adminGoogleId ||
      typeof googleId !== "string" ||
      googleId !== adminGoogleId
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse and validate the playback command.
    const body = await request.json();
    const { action, time, patchIndex, socketId } = body;

    if (!["play", "pause"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
      return NextResponse.json(
        { error: "Invalid playback time" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(patchIndex) ||
      patchIndex < 0 ||
      patchIndex >= PATCH_COUNT
    ) {
      return NextResponse.json(
        { error: "Invalid patch index" },
        { status: 400 }
      );
    }

    // Accept only a valid Pusher socket ID.
    const options =
      typeof socketId === "string" && /^\d+\.\d+$/.test(socketId)
        ? { socket_id: socketId }
        : {};

    // 4. Broadcast only after successful authorization.
    const pusher = getPusher();

    await pusher.trigger(
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SYNC API ERROR]", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to process playback command" },
      { status: 500 }
    );
  }
}