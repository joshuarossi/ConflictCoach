import { useParams } from "react-router-dom";

export function ClosedCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  return (
    <div>
      <h1 className="text-h1 font-bold text-text-primary mb-4">Case Closed</h1>
      <p className="text-text-secondary">Case: {caseId}</p>
    </div>
  );
}
