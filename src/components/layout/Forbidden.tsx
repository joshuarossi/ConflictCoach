export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
      <p className="text-lg text-gray-600">
        You do not have permission to access this page.
      </p>
    </div>
  );
}
