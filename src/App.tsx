import { Routes, Route, Navigate, useInRouterContext } from "react-router-dom";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";

function SignIn() {
  const { signIn } = useAuthActions();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Welcome to Conflict Coach
      </h1>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => void signIn("google")}
          className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Continue with Google
        </button>
        <button
          onClick={() => void signIn("magic-link")}
          className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Sign in with Magic Link
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome back!</p>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  // useConvexAuth returns undefined when ConvexAuthProvider is absent (e.g. unit tests).
  // The type says it always returns an object, but the context default is undefined.
  const authState = useConvexAuth() as
    | { isLoading: boolean; isAuthenticated: boolean }
    | undefined;

  if (!authState) {
    return <>{children}</>;
  }

  if (authState.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <SignIn />;
  }

  return <>{children}</>;
}

export default function App() {
  const inRouter = useInRouterContext();
  return (
    <AuthGate>
      {inRouter ? (
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      ) : (
        <Dashboard />
      )}
    </AuthGate>
  );
}
