import { Form, Outlet, useLoaderData } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { StepLink } from "../components";
import type { CaptureLoaderData } from "../utils/types";

export function CaptureLayout() {
  const { completion, progressCount } = useLoaderData() as CaptureLoaderData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,244,238,0.96))]">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Badge variant="outline">Capture flow</Badge>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                Build the first multimodal draft and hand it to the backend.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This flow captures interview, voice, and image intent step by step. Draft state now stays in browser
                memory during the session, and the review step submits the final payload to the backend job API.
              </p>
            </div>
          </div>
          <Card className="bg-white/88">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Progress</CardTitle>
                <Badge variant={progressCount === 3 ? "success" : "outline"}>{progressCount}/3 steps</Badge>
              </div>
              <CardDescription>
                Files are still metadata-only in this phase. The next upload step can extend the same payload shape.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progressCount / 3) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit bg-white/92">
          <CardHeader>
            <CardTitle className="text-lg">Step map</CardTitle>
            <CardDescription>Move step by step or jump back to revise any section.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StepLink done={completion.interview} title="1. Interview" to="/capture/interview" />
            <StepLink done={completion.voice} title="2. Voice" to="/capture/voice" />
            <StepLink done={completion.image} title="3. Image" to="/capture/image" />
            <StepLink done={completion.interview && completion.voice && completion.image} title="4. Review" to="/capture/review" />
          </CardContent>
          <div className="px-6 pb-6">
            <Form action="/capture/reset" method="post">
              <Button className="w-full" type="submit" variant="outline">
                Reset current draft
              </Button>
            </Form>
          </div>
        </Card>

        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
