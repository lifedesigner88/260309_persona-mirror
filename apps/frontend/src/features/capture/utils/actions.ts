import { redirect } from "react-router-dom";

import { clearCaptureDraft, getCompletion, getNextPath, readCaptureDraft, readFileName, saveDraft } from "./storage";
import type { CaptureLoaderData, CaptureSubmitActionData } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function captureLoader({ request }: { request: Request }): CaptureLoaderData {
  const draft = readCaptureDraft();
  const completion = getCompletion(draft);
  const url = new URL(request.url);
  return {
    draft,
    completion,
    progressCount: Object.values(completion).filter(Boolean).length,
    nextPath: getNextPath(completion),
    submittedJobId: url.searchParams.get("submitted"),
  };
}

export async function interviewAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const draft = readCaptureDraft();

  saveDraft({
    ...draft,
    interview: {
      selfSummary: String(formData.get("selfSummary") ?? "").trim(),
      coreValues: String(formData.get("coreValues") ?? "").trim(),
      speakingStyle: String(formData.get("speakingStyle") ?? "").trim(),
      keywords: String(formData.get("keywords") ?? "").trim(),
    },
  });

  return redirect("/capture/voice");
}

export async function voiceAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const draft = readCaptureDraft();
  const existingFileName = String(formData.get("existingSampleFileName") ?? "").trim();

  saveDraft({
    ...draft,
    voice: {
      inputMode: String(formData.get("inputMode") ?? "later").trim() as (typeof draft.voice)["inputMode"],
      sampleFileName: readFileName(formData.get("sampleFile"), existingFileName),
      toneNotes: String(formData.get("toneNotes") ?? "").trim(),
      deliveryGoal: String(formData.get("deliveryGoal") ?? "").trim(),
    },
  });

  return redirect("/capture/image");
}

export async function imageAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const draft = readCaptureDraft();
  const existingFileName = String(formData.get("existingReferenceFileName") ?? "").trim();

  saveDraft({
    ...draft,
    image: {
      inputMode: String(formData.get("inputMode") ?? "later").trim() as (typeof draft.image)["inputMode"],
      referenceFileName: readFileName(formData.get("referenceFile"), existingFileName),
      visualDirection: String(formData.get("visualDirection") ?? "").trim(),
      framingNotes: String(formData.get("framingNotes") ?? "").trim(),
    },
  });

  return redirect("/capture/review");
}

export async function resetCaptureAction() {
  clearCaptureDraft();
  return redirect("/capture");
}

export async function submitCaptureAction(): Promise<CaptureSubmitActionData | Response> {
  const draft = readCaptureDraft();
  const completion = getCompletion(draft);

  if (!completion.interview || !completion.voice || !completion.image) {
    return { error: "Complete interview, voice, and image steps before submitting." };
  }

  const response = await fetch(`${API_BASE_URL}/capture/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
    credentials: "include",
  });

  if (response.status === 401) {
    return redirect("/auth/login");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail ?? "Failed to create capture job." };
  }

  const data = (await response.json()) as { id: string };
  clearCaptureDraft();
  return redirect(`/capture?submitted=${data.id}`);
}
