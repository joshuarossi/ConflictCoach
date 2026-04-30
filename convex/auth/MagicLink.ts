import { Email } from "@convex-dev/auth/providers/Email";

/**
 * Magic link (passwordless email) provider.
 *
 * Uses the MAGIC_LINK_EMAIL_FROM environment variable as the sender address.
 * No password fields or password reset flows per PRD US-01.
 */
export const MagicLink = Email({
  id: "magic-link",
  async sendVerificationRequest({
    identifier: email,
    url,
  }: {
    identifier: string;
    url: string;
  }) {
    const fromAddress = process.env.MAGIC_LINK_EMAIL_FROM;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress ?? "Conflict Coach <noreply@conflictcoach.app>",
        to: [email],
        subject: "Sign in to Conflict Coach",
        html: `<p>Click <a href="${url}">here</a> to sign in to Conflict Coach.</p>`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to send magic link email: ${await res.text()}`);
    }
  },
});
