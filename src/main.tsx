import { ConvexAuthProvider as ConvexProviderWithAuth } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";
import "./index.css";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL || "https://placeholder.convex.cloud",
);

// E2E test hook (WOR-71): mounted only when the build was started with
// VITE_E2E_TEST_MODE=true. Production builds tree-shake the import out
// because the dynamic import is behind a static-false branch.
const isE2ETestMode = import.meta.env.VITE_E2E_TEST_MODE === "true";

const TestHooksMount = isE2ETestMode
  ? lazy(() =>
      import("./testHooks").then((mod) => ({ default: mod.TestHooksMount })),
    )
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProviderWithAuth client={convex}>
      <BrowserRouter>
        <App />
        {TestHooksMount && (
          <Suspense fallback={null}>
            <TestHooksMount />
          </Suspense>
        )}
      </BrowserRouter>
    </ConvexProviderWithAuth>
  </StrictMode>,
);
