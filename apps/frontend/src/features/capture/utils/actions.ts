import { redirect, type LoaderFunctionArgs } from "react-router-dom";

import {
  readCaptureJobResponse,
  readCaptureJobsResponse,
  requestAuthMe,
  requestCaptureJob,
  requestCaptureJobs,
  requestCreateCaptureJob,
  requestDeleteCaptureJob,
} from "./api";
import { clearCaptureDraft, getCompletion, getNextPath, readCaptureDraft, readFileName, saveDraft } from "./storage";
import type {
  CaptureJobActionData,
  CaptureJobDetailLoaderData,
  CaptureJobsLoaderData,
  CaptureLoaderData,
  CaptureSubmitActionData,
} from "./types";

async function readApiError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return data?.detail ?? fallback;
}

export async function captureLoader(): Promise<CaptureLoaderData | Response> {
  const response = await requestAuthMe();
  if (response.status === 401) {
    return redirect("/auth/login");
  }

  const draft = readCaptureDraft();
  const completion = getCompletion(draft);
  return {
    draft,
    completion,
    progressCount: Object.values(completion).filter(Boolean).length,
    nextPath: getNextPath(completion),
  };
}

export async function captureJobsLoader({ request }: LoaderFunctionArgs): Promise<CaptureJobsLoaderData | Response> {
  const response = await requestCaptureJobs();

  if (response.status === 401) {
    return redirect("/auth/login");
  }
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load capture submissions."));
  }

  const url = new URL(request.url);
  return {
    jobs: await readCaptureJobsResponse(response),
    deletedJobId: url.searchParams.get("deleted"),
  };
}

export async function captureJobDetailLoader({ params, request }: LoaderFunctionArgs): Promise<CaptureJobDetailLoaderData | Response> {
  const jobId = params.jobId;
  if (!jobId) {
    throw new Error("Capture job id is required.");
  }

  const response = await requestCaptureJob(jobId);
  if (response.status === 401) {
    return redirect("/auth/login");
  }
  if (response.status === 404) {
    throw new Response("Not Found", { status: 404 });
  }
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load capture submission."));
  }

  const url = new URL(request.url);
  return {
    job: await readCaptureJobResponse(response),
    created: url.searchParams.get("created") === "1",
  };
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

  if (!completion.interview) {
    return { error: "Complete the interview before submitting." };
  }

  const response = await requestCreateCaptureJob(draft);

  if (response.status === 401) {
    return redirect("/auth/login");
  }

  if (!response.ok) {
    return { error: await readApiError(response, "Failed to create capture job.") };
  }

  const data = await readCaptureJobResponse(response);
  clearCaptureDraft();
  return redirect(`/capture/submissions/${data.id}?created=1`);
}

export async function captureJobDetailAction({ params, request }: LoaderFunctionArgs): Promise<CaptureJobActionData | Response> {
  const jobId = params.jobId;
  if (!jobId) {
    throw new Error("Capture job id is required.");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "").trim();

  if (intent !== "delete") {
    return { error: "Unsupported capture job action." };
  }

  const response = await requestDeleteCaptureJob(jobId);
  if (response.status === 401) {
    return redirect("/auth/login");
  }
  if (response.status === 404) {
    return redirect("/capture/submissions");
  }
  if (!response.ok) {
    return { error: await readApiError(response, "Failed to delete capture submission.") };
  }

  return redirect(`/capture/submissions?deleted=${jobId}`);
}
