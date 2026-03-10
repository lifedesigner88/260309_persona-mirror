import { Form, useNavigation } from "react-router-dom";

import { Field, Input, Textarea } from "@/common/components";

import { CapturePageActions, CapturePageShell } from "../components";
import { useCaptureRouteData } from "../utils/hooks";

export function InterviewCapturePage() {
  const { draft } = useCaptureRouteData();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";

  return (
    <Form method="post">
      <CapturePageShell
        badge="Step 1"
        description="Start with the text layer. This becomes the base for persona extraction and prompt construction."
        footer={<CapturePageActions backTo="/capture" loading={loading} />}
        title="Interview frame"
      >
          <Field hint="Two or three lines are enough for now." label="How does the user describe themselves?">
            <Textarea defaultValue={draft.interview.selfSummary} name="selfSummary" placeholder="Calm, analytical, optimistic..." required />
          </Field>
          <Field hint="Comma-separated or short sentences both work." label="Core values">
            <Textarea defaultValue={draft.interview.coreValues} name="coreValues" placeholder="curiosity, consistency, kindness..." required />
          </Field>
          <Field hint="This becomes useful for tone/persona conditioning later." label="Speaking style">
            <Textarea
              defaultValue={draft.interview.speakingStyle}
              name="speakingStyle"
              placeholder="Direct but warm, slow pacing, avoids slang..."
              required
            />
          </Field>
          <Field hint="Optional shorthand for quick scanning." label="Keywords">
            <Input defaultValue={draft.interview.keywords} name="keywords" placeholder="gentle, precise, reflective" />
          </Field>
      </CapturePageShell>
    </Form>
  );
}
