Video Streamer --- How It Works
This Next.js app is deployed on Vercel and plays a movie split into
multiple MP4 files hosted on Cloudinary.
Playback Flow
1. Add the segments: The movie's Cloudinary URLs are listed in
   order in the MOVIE_PATCHES array in app/page.js.
2. Play the first segment: The player loads the URL at the current
   segment index.
3. Preload the next segment: Two HTML video elements are used. One
   plays the current segment while the other loads the next segment in
   advance.
4. Switch automatically: When the active video fires its ended
   event, the app waits until the next video is ready, switches the
   active player, and advances the segment index. This lets the movie
   continue across the ordered files without requiring the viewer to
   click each one.
5. Finish: Playback ends when the final URL in the array has
   finished.
The segment order matters: the URLs must be listed in the correct
sequence.
Synchronized Viewing
- Google sign-in: NextAuth authenticates users.
- Admin controls: The authenticated user's admin status is
  determined server-side using the configured Google account ID.
- Real-time sync: When the administrator plays or pauses a
  segment, the app sends the action, playback time, and segment index
  to /api/sync.
- Pusher: The API broadcasts synchronization events through the
  movie-room channel. Other connected viewers use these events to
  follow the administrator's playback position and segment.
Each viewer streams the video files directly from Cloudinary. The
Next.js app handles the player and coordination, while Pusher carries
small synchronization events.
Deployment
- Vercel: Hosts the deployed Next.js application and its API
  routes.
- Cloudinary: Hosts the MP4 video segments.
Main Technologies
- Next.js and React: User interface and playback logic.
- Cloudinary: Hosts the MP4 segments.
- NextAuth with Google OAuth: Sign-in and admin identity.
- Pusher: Real-time playback synchronization.
- app/api/sync/route.js: Server endpoint for authorized
  synchronization broadcasts.
Configuration and Security
Keep Google OAuth credentials, the NextAuth secret, Pusher server
credentials, and the administrator's Google account ID in environment
variables. Do not commit secrets to source control.
