export type CaptureStep = "interview" | "voice" | "image";

export type CaptureDraft = {
  interview: {
    selfSummary: string;
    coreValues: string;
    speakingStyle: string;
    keywords: string;
  };
  voice: {
    inputMode: "upload" | "record" | "later";
    sampleFileName: string;
    toneNotes: string;
    deliveryGoal: string;
  };
  image: {
    inputMode: "upload" | "camera" | "later";
    referenceFileName: string;
    visualDirection: string;
    framingNotes: string;
  };
  updatedAt: string | null;
};

export type CaptureCompletion = Record<CaptureStep, boolean>;

export type CaptureLoaderData = {
  draft: CaptureDraft;
  completion: CaptureCompletion;
  progressCount: number;
  nextPath: string;
  submittedJobId: string | null;
};

export type CaptureSubmitActionData = {
  error?: string;
};

export const EMPTY_DRAFT: CaptureDraft = {
  interview: {
    selfSummary: "",
    coreValues: "",
    speakingStyle: "",
    keywords: "",
  },
  voice: {
    inputMode: "later",
    sampleFileName: "",
    toneNotes: "",
    deliveryGoal: "",
  },
  image: {
    inputMode: "later",
    referenceFileName: "",
    visualDirection: "",
    framingNotes: "",
  },
  updatedAt: null,
};
