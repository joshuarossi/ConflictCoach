import { useParams } from "react-router-dom";

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="text-h1 font-bold text-text-primary mb-4">Edit Template</h1>
      <p className="text-text-secondary">Template: {id}</p>
    </div>
  );
}
