import { useParams } from "react-router-dom";

export function ClosedCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Case Closed</h1>
      <p className="text-gray-600">Case: {caseId}</p>
    </div>
  );
}
