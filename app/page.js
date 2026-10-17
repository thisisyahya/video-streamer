"use client";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

/* ---------------- MOCK DATA ---------------- */
const MOVIE = {
  title: "Spider-Man: Brand New Day",
  image:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8L_ltzcT5nwFz1jGx7wu7IesHRutxNCcnIn4azxa_Ww&s=10",
  wideImage:
    "https://www.indiewire.com/wp-content/uploads/2026/07/Spider-Man-Brand-New-Day.webp?w=600&h=337&crop=1",
  match: 98,
  year: 2026,
  rating: "PG-13",
  duration: "2h 28m",
  quality: "4K",
  description:
    "Peter Parker is trying to rebuild his life after a shocking revelation changed everything. When a new threat emerges from the shadows of New York, he must decide how far he is willing to go to protect the people he loves.",
  genres: ["Action", "Superhero", "Adventure"],
  cast: ["Tom Holland", "Zendaya", "Jacob Batalon", "Marisa Tomei"],
  mood: ["Exciting", "Heroic", "Fast-paced"],
};

/* ---------------- ICONS ---------------- */
const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4l14 8-14 8z" />
  </svg>
);

/* ---------------- PAGE ---------------- */
export default function MoviePage() {
  const { data: session, status } = useSession();
  return (
    <div className="min-h-screen bg-[#141414] font-sans text-white antialiased">


      {/* NAVBAR */}
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-5 md:px-[4%]">
        <Link href="/" className="text-3xl font-black text-[#E50914]">
          COWATCH
        </Link>

        {status !== "loading" && (
          session ? (
            <button
              onClick={() => signOut()}
              className="rounded bg-white px-5 py-2 font-bold text-black hover:bg-gray-200"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded bg-[#E50914] px-5 py-2 font-bold text-white hover:bg-red-700"
            >
              Login
            </button>
          )
        )}
      </header>


      <main>
        {/* HERO */}
        <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden md:h-[85vh]">
          <img
            src={MOVIE.image}
            alt={MOVIE.title}
            className="absolute inset-0 h-full w-full object-cover object-top md:hidden"
          />
          <img
            src={MOVIE.wideImage}
            alt={MOVIE.title}
            className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 md:px-[4%] md:pb-[12vh]">
            <div className="max-w-[640px]">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[3px] text-[#E50914] md:text-[13px]">
                <span className="h-px w-6 bg-[#E50914]" /> Cowatch Original
              </div>
              <h1 className="mb-4 text-[40px] font-black leading-[1] [text-shadow:0_4px_16px_rgba(0,0,0,0.6)] md:text-[64px]">
                {MOVIE.title}
              </h1>

              <div className="mb-4 flex flex-wrap items-center gap-2.5 text-sm text-[#e5e5e5] md:text-base">
                <span className="font-bold text-[#46d369]">{MOVIE.match}% Match</span>
                <span>{MOVIE.year}</span>
                <span className="rounded-sm border border-[#888] px-1.5 text-xs">{MOVIE.rating}</span>
                <span>{MOVIE.duration}</span>
                <span className="rounded-sm border border-[#888] px-1 text-[10px]">{MOVIE.quality}</span>
              </div>

              <p className="mb-6 line-clamp-3 text-sm leading-snug text-[#e5e5e5] [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] md:line-clamp-none md:text-lg">
                {MOVIE.description}
              </p>

              {/* WATCH LIVE BUTTON */}
              <Link
                href="/watch"
                className="group relative inline-flex items-center gap-2 rounded bg-[#E50914] px-8 py-3 text-base font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.8),0_0_50px_rgba(229,9,20,0.5)] animate-pulse transition hover:bg-[#ff1a25] md:px-10 md:py-3.5 md:text-lg"
              >
                <span className="absolute inset-0 -z-10 animate-ping rounded bg-[#E50914]/60" />
                <PlayIcon /> Watch Live
              </Link>
            </div>
          </div>
        </section>

        {/* DETAILS */}
        <section className="grid gap-8 px-4 py-8 md:grid-cols-[2fr_1fr] md:gap-12 md:px-[4%] md:py-10">
          <div>
            <p className="text-base leading-relaxed text-[#e5e5e5] md:text-lg">{MOVIE.description}</p>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-[#777]">
            <p>
              <span className="text-[#777]">Cast: </span>
              <span className="text-[#e5e5e5]">{MOVIE.cast.join(", ")}</span>
            </p>
            <p>
              <span className="text-[#777]">Genres: </span>
              <span className="text-[#e5e5e5]">{MOVIE.genres.join(", ")}</span>
            </p>
            <p>
              <span className="text-[#777]">This movie is: </span>
              <span className="text-[#e5e5e5]">{MOVIE.mood.join(", ")}</span>
            </p>
          </div>
        </section>a
      </main>
    </div>
  );
}