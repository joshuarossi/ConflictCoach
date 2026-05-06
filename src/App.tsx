import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { ReadingLayout, ChatLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { InviteAcceptPage } from "@/pages/InviteAcceptPage";
import { Dashboard } from "@/pages/Dashboard";
import { NewCasePage } from "@/pages/NewCasePage";
import { CaseDetail } from "@/pages/CaseDetail";
import { PrivateCoachingPage } from "@/pages/PrivateCoachingPage";
import { ReadyForJointPage } from "@/pages/ReadyForJointPage";
import { JointChatPage } from "@/pages/JointChatPage";
import { ClosedCasePage } from "@/pages/ClosedCasePage";
import { TemplatesListPage } from "@/pages/admin/TemplatesListPage";
import { TemplateEditPage } from "@/pages/admin/TemplateEditPage";
import { AuditLogPage } from "@/pages/admin/AuditLogPage";

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Authenticated routes */}
      <Route element={<AuthGuard />}>
        {/* Reading-width layout (720px) */}
        <Route element={<ReadingLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cases/new" element={<NewCasePage />} />
          <Route path="/cases/:caseId" element={<CaseDetail />} />
          <Route path="/cases/:caseId/ready" element={<ReadyForJointPage />} />
          <Route path="/cases/:caseId/closed" element={<ClosedCasePage />} />
        </Route>

        {/* Chat-width layout (1080px) */}
        <Route element={<ChatLayout />}>
          <Route path="/cases/:caseId/private" element={<PrivateCoachingPage />} />
          <Route path="/cases/:caseId/joint" element={<JointChatPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminGuard />}>
          <Route element={<ReadingLayout />}>
            <Route path="/admin/templates" element={<TemplatesListPage />} />
            <Route path="/admin/templates/:id" element={<TemplateEditPage />} />
            <Route path="/admin/audit" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;

// Alias for tests / consumers that prefer a more descriptive name.
export const AppRoutes = App;
