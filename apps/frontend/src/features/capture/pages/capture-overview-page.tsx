import { NavLink } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { useCaptureRouteData } from "../utils/hooks";

export function CaptureOverviewPage() {
  const { draft, nextPath, completion, submittedJobId } = useCaptureRouteData();

  return (
    <div className="space-y-6">
      {submittedJobId ? (
        <Card className="border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(240,253,250,0.94))]">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
            <div className="space-y-2">
              <Badge variant="success">Submitted</Badge>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">Capture job created</h3>
              <p className="text-sm leading-6 text-foreground/80">
                The draft was submitted to the backend and turned into a capture job.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-medium text-foreground">
              Job ID: {submittedJobId}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant="outline">Workflow entry</Badge>
            <CardTitle className="text-2xl">Prepare and submit the capture draft</CardTitle>
            <CardDescription className="max-w-2xl">
              The first three screens collect the payload in browser memory. The review step now submits that payload to
              the backend capture job API.
            </CardDescription>
          </div>
          <NavLink to={nextPath}>
            <Button size="lg">{completion.interview || completion.voice || completion.image ? "Continue draft" : "Start capture"}</Button>
          </NavLink>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,236,0.96))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">
                {draft.interview.selfSummary || "Describe how the user sees themselves, their values, and their speaking texture."}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,246,0.96))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">
                {draft.voice.toneNotes || "Capture either a sample filename or notes about delivery, energy, and pacing."}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,245,240,0.96))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Image</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">
                {draft.image.visualDirection || "Collect a reference image path, camera intent, and the artistic direction you want."}
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
