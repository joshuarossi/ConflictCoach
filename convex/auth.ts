/* eslint-disable @typescript-eslint/no-explicit-any */
import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const providers: any[] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }),
  Email({
    from: process.env.MAGIC_LINK_EMAIL_FROM,
    // Magic link behavior: authorize is undefined so only the token is needed.
    authorize: undefined,
    async sendVerificationRequest({ identifier: email, url }) {
      const from = requireEnv("MAGIC_LINK_EMAIL_FROM");
      const response = await fetch(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Sign in to Conflict Coach",
          html: `<p>Click this link to sign in to Conflict Coach:</p><p><a href="${escapeHtml(url)}">Sign in</a></p><p>If you did not request this email, you can ignore it.</p>`,
          text: `Click this link to sign in to Conflict Coach:\n\n${url}\n\nIf you did not request this email, you can ignore it.`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend failed to send magic link: ${errorText}`);
      }
    },
  }),
];

// Test-mode Password provider — allows E2E fixtures (WOR-71) to create
// users and authenticate without email/OAuth round-trips.
if (process.env.CLAUDE_MOCK === "true") {
  providers.push(
    Password({
      id: "test-password",
      profile(params: Record<string, any>) {
        return {
          email: params.email as string,
          displayName: (params.name as string) ?? "Test User",
          role: "USER" as const,
          createdAt: Date.now(),
        };
      },
    }),
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
  session: {
    totalDurationMs: THIRTY_DAYS_MS,
    inactiveDurationMs: THIRTY_DAYS_MS,
  },
});
