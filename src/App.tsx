import { Routes, Route, useInRouterContext } from "react-router-dom";

function Home() {
  return <h1 className="text-2xl font-bold text-gray-900">Conflict Coach</h1>;
}

export default function App() {
  const inRouter = useInRouterContext();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {inRouter ? (
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      ) : (
        <Home />
      )}
    </div>
  );
}
