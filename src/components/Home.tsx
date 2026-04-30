import { Button } from "@/components/ui/button";

export function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8">
      <h1 className="mb-4 text-3xl font-medium tracking-tight text-text-primary">
        Conflict Coach
      </h1>
      <p className="mb-8 text-text-secondary">
        AI-guided mediation for better conversations.
      </p>
      <Button>Get Started</Button>
    </div>
  );
}
