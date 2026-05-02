import { useQuery } from "convex/react";
import { Outlet } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Forbidden } from "./Forbidden";

export function AdminGuard() {
  const user = useQuery(api.users.me);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return <Forbidden />;
  }

  return <Outlet />;
}
