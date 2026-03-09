import {
  Form,
  Link,
  Outlet,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError
} from "react-router-dom";
import { Button } from "@/components/ui/button";

export function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold tracking-tight">PersonaMirror</h1>
      <nav className="mb-4 mt-4 flex gap-3">
        <Link className="text-sm underline-offset-4 hover:underline" to="/">
          Home
        </Link>
        <Link className="text-sm underline-offset-4 hover:underline" to="/capture">
          Capture
        </Link>
      </nav>
      <Outlet />
    </main>
  );
}

type HomeLoaderData = { initialStatus: string };
type HomeActionData = { result: string };

async function requestHealthStatus(): Promise<string> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  const data = (await response.json()) as { status?: string };
  return data.status ?? "unknown";
}

export function homeLoader(): HomeLoaderData {
  return { initialStatus: "not checked" };
}

export async function homeAction(): Promise<HomeActionData> {
  try {
    const result = await requestHealthStatus();
    return { result };
  } catch {
    return { result: "request failed" };
  }
}

export function HomePage() {
  const loaderData = useLoaderData() as HomeLoaderData;
  const actionData = useActionData() as HomeActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const result = actionData?.result ?? loaderData.initialStatus;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <p className="text-sm text-muted-foreground">Phase 0 frontend scaffold is ready.</p>
      <Form method="post">
        <Button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check Backend Health"}
        </Button>
      </Form>
      <p className="text-sm">health: {result}</p>
    </section>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  if (error instanceof Error) {
    return (
      <section>
        <h2>Unexpected Application Error</h2>
        <p>{error.message}</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Unexpected Application Error</h2>
      <p>Unknown error</p>
    </section>
  );
}

export function CapturePage() {
  return <p className="text-sm text-muted-foreground">Camera/Mic capture UI will be implemented in Phase 1.</p>;
}
