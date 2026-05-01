interface StreamingIndicatorProps {
  label?: string;
}

export function StreamingIndicator({
  label = "Coach is replying",
}: StreamingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2" role="status">
      <span className="sr-only">{label}</span>
      <span
        data-testid="streaming-cursor"
        aria-hidden="true"
        className="streaming-cursor inline-block h-4 w-0.5 animate-blink bg-coach-accent motion-reduce:animate-none"
        style={{ animation: "blink 0.5s steps(2, start) infinite" }}
      />
    </div>
  );
}
