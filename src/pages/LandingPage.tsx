import { useConvexAuth } from "@convex-dev/auth/react";
import { Link, Navigate } from "react-router-dom";
import { MessageCircle, Users, ShieldCheck } from "lucide-react";

export function LandingPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Authenticated users skip the marketing page and land on the dashboard.
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-canvas">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <div className="max-w-[720px] text-center">
          <h1 className="text-display font-medium tracking-[-0.02em] text-text-primary mb-4">
            A calm place to work through a difficult conversation.
          </h1>
          <p className="text-h3 text-text-secondary mb-8">
            Guided coaching to help you find resolution — privately and
            together.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-md bg-accent px-6 py-3 text-accent-on font-medium hover:bg-accent-hover transition-colors duration-150"
          >
            Start a case
          </Link>
        </div>
      </section>

      {/* Three-step explainer */}
      <section className="px-4 py-16 bg-surface">
        <div className="max-w-[720px] mx-auto">
          <h2 className="sr-only">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <MessageCircle
                className="w-8 h-8 text-accent"
                strokeWidth={1.5}
              />
              <h3 className="font-medium text-text-primary">
                Private Coaching
              </h3>
              <p className="text-label text-text-secondary">
                Work through your perspective privately with an AI coach.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Users className="w-8 h-8 text-accent" strokeWidth={1.5} />
              <h3 className="font-medium text-text-primary">
                Shared Conversation
              </h3>
              <p className="text-label text-text-secondary">
                Come together in a facilitated discussion with AI guidance.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-accent" strokeWidth={1.5} />
              <h3 className="font-medium text-text-primary">Resolution</h3>
              <p className="text-label text-text-secondary">
                Reach understanding and agreement on your own terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section className="px-4 py-16">
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="text-h2 font-medium text-text-primary mb-3">
            Your words are yours
          </h2>
          <p className="text-text-secondary mb-4">
            Here's how we protect them. Your private coaching stays private —
            the other party never sees it. All conversations are encrypted and
            you control what gets shared.
          </p>
          <Link
            to="/privacy"
            className="text-accent hover:text-accent-hover underline text-label"
          >
            Learn how we protect your data
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default px-4 py-8">
        <div className="max-w-[720px] mx-auto flex items-center justify-center gap-6 text-label text-text-secondary">
          <Link to="/terms" className="hover:text-text-primary">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-text-primary">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}
