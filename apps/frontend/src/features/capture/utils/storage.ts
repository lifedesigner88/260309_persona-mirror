import { EMPTY_DRAFT, type CaptureCompletion, type CaptureDraft } from "./types";

let captureDraft: CaptureDraft = cloneDraft(EMPTY_DRAFT);

function cloneDraft(draft: CaptureDraft): CaptureDraft {
  return {
    interview: {
      ...draft.interview,
    },
    voice: {
      ...draft.voice,
    },
    image: {
      ...draft.image,
    },
    updatedAt: draft.updatedAt,
  };
}

export function readCaptureDraft(): CaptureDraft {
  return cloneDraft(captureDraft);
}

export function writeCaptureDraft(draft: CaptureDraft) {
  captureDraft = cloneDraft(draft);
}

export function clearCaptureDraft() {
  captureDraft = cloneDraft(EMPTY_DRAFT);
}

export function saveDraft(nextDraft: CaptureDraft) {
  writeCaptureDraft({
    ...nextDraft,
    updatedAt: new Date().toISOString(),
  });
}

export function getCompletion(draft: CaptureDraft): CaptureCompletion {
  const interviewDone =
    draft.interview.selfSummary.trim().length > 0 &&
    draft.interview.coreValues.trim().length > 0 &&
    draft.interview.speakingStyle.trim().length > 0;

  const voiceDone =
    draft.voice.inputMode === "later" ||
    draft.voice.sampleFileName.trim().length > 0 ||
    draft.voice.toneNotes.trim().length > 0;

  const imageDone =
    draft.image.inputMode === "later" ||
    (draft.image.visualDirection.trim().length > 0 &&
      (draft.image.referenceFileName.trim().length > 0 || draft.image.framingNotes.trim().length > 0));

  return {
    interview: interviewDone,
    voice: voiceDone,
    image: imageDone,
  };
}

export function getNextPath(completion: CaptureCompletion) {
  if (!completion.interview) {
    return "/capture/interview";
  }
  if (!completion.voice) {
    return "/capture/voice";
  }
  if (!completion.image) {
    return "/capture/image";
  }
  return "/capture/review";
}

export function readFileName(entry: FormDataEntryValue | null, fallback = "") {
  if (entry instanceof File && entry.size > 0) {
    return entry.name;
  }
  return fallback;
}
