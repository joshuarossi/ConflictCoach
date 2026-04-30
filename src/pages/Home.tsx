import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <h1 className="mb-4 text-4xl font-bold">Conflict Coach</h1>
      <p className="mb-8 text-muted-foreground">
        Navigate conflict with confidence.
      </p>
      <Button>Get Started</Button>
    </main>
  );
}
