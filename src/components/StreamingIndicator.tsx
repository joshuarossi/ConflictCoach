interface StreamingIndicatorProps {
  label?: string;
}

export function StreamingIndicator({
  label = "Coach is replying",
}: StreamingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2" role="status">
      <span className="sr-only">{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coach-accent [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coach-accent [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coach-accent [animation-delay:300ms]" />
      </span>
      <span className="text-meta text-text-secondary">{label}</span>
    </div>
  );
}
