import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        A calm place to work through a difficult conversation.
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
        Private coaching, shared conversation, resolution.
      </p>
      <Link
        to="/login"
        className="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
      >
        Start a case
      </Link>
    </div>
  );
}
