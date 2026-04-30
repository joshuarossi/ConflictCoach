import Google from "@auth/core/providers/google";
import Email from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    }),
    Email({
      from: process.env.MAGIC_LINK_EMAIL_FROM ?? "noreply@example.com",
      // Magic link behavior: authorize is undefined so only the token is needed
      authorize: undefined,
      async sendVerificationRequest({ identifier: email, url }) {
        // In production, integrate a real email sender (e.g. Resend, SES).
        // For development, log the magic link to the Convex dashboard.
        console.log(`Magic link for ${email}: ${url}`);
      },
    }),
  ],
  session: {
    totalDurationMs: THIRTY_DAYS_MS,
    inactiveDurationMs: THIRTY_DAYS_MS,
  },
};

export default authConfig;

export const { auth, signIn, signOut, store, isAuthenticated } =
  convexAuth(authConfig);
