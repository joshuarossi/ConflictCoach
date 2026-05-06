export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-h1 font-medium text-text-primary mb-2">403</h1>
      <p className="text-h3 text-text-secondary">
        You do not have permission to access this page.
      </p>
    </div>
  );
}
