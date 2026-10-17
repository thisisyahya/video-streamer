import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      // profile.sub is the Google user ID, present on first sign-in.
      if (profile?.sub) {
        token.googleId = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose only a boolean to the client, not the Google ID.
      session.user.isAdmin =
        typeof token.googleId === "string" &&
        token.googleId === process.env.ADMIN_GOOGLE_ID;
      return session;
    },
  },
});

export { handler as GET, handler as POST };