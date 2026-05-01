import { useConvexAuth } from "@convex-dev/auth/react";
import { Routes, Route, useInRouterContext, useLocation } from "react-router-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { ConnectedPrivateCoachingView } from "@/components/PrivateCoachingView";
import { SignIn } from "@/components/SignIn";

function Home() {
  return (
    <div className="w-full">
      <PrivacyBanner
        text="This conversation is private to you."
        otherPartyName="Partner"
      />
      <h1 className="text-2xl font-bold text-gray-900 p-4">Conflict Coach</h1>
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const inRouter = useInRouterContext();
  const location = useLocation();

  // Render sign-in form immediately at /login without waiting for auth to resolve
  if (location.pathname === "/login") {
    return <SignIn />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {inRouter ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cases/:id/private" element={<ConnectedPrivateCoachingView />} />
        </Routes>
      ) : (
        <Home />
      )}
    </div>
  );
}
