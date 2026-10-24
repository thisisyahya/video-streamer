# Video Streamer — How It Works

Video Streamer is a Next.js application deployed on Vercel that plays a movie divided into multiple MP4 segments hosted on Cloudinary. It also supports synchronized viewing, allowing multiple users to watch together while following the administrator’s playback.

## Playback Flow

The Cloudinary URLs for all movie segments are stored in order in the `MOVIE_PATCHES` array in `app/page.js`. The player loads the first segment and uses two HTML video elements to play the current segment while preloading the next one. When the active video finishes, the application switches to the next video once it is ready and continues playback automatically. This process repeats until the final segment finishes.

The order of the URLs is important because the application uses the array sequence to determine the correct playback order.

## Synchronized Viewing

Users authenticate through Google sign-in using NextAuth. The application determines administrator privileges on the server by checking the authenticated user's Google account ID against the configured administrator ID.

When the administrator plays or pauses the movie, the application sends the playback action, current playback time, and segment index to the `/api/sync` endpoint. The endpoint uses Pusher to broadcast synchronization events through the `movie-room` channel. Other connected viewers receive these events and update their playback state to follow the administrator.

Each viewer streams the video segments directly from Cloudinary. The Next.js application manages playback and coordination, while Pusher transmits the small real-time synchronization events.

## Deployment and Technologies

The application is deployed on Vercel, which hosts the Next.js frontend and API routes. Cloudinary stores and delivers the MP4 video segments.

The main technologies are Next.js and React for the user interface and playback logic, NextAuth with Google OAuth for authentication and administrator identification, Pusher for real-time synchronization, and `app/api/sync/route.js` for handling synchronization requests and broadcasts.

## Configuration and Security

Google OAuth credentials, the NextAuth secret, Pusher server credentials, and the administrator’s Google account ID should be stored in environment variables. These secrets must not be committed to source control.
