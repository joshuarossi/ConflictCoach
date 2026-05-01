import { useParams } from "react-router-dom";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        You've been invited to work through something together.
      </h1>
      <p className="text-gray-600">Invite token: {token}</p>
    </div>
  );
}
