import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { MagicLink } from "./auth/MagicLink";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    }),
    MagicLink,
  ],
  session: {
    // 30-day session expiry per PRD US-01
    totalDurationMs: 30 * 24 * 60 * 60 * 1000,
    inactiveDurationMs: 30 * 24 * 60 * 60 * 1000,
  },
});
