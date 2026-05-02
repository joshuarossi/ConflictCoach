import { useParams } from "react-router-dom";

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Edit Template</h1>
      <p className="text-gray-600">Template: {id}</p>
    </div>
  );
}
