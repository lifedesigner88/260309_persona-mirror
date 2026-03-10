import { Form, useNavigation } from "react-router-dom";

import { Field, Input, Textarea } from "@/common/components";

import { CapturePageActions, CapturePageShell, ChoiceCard } from "../components";
import { useCaptureRouteData } from "../utils/hooks";

export function VoiceCapturePage() {
  const { draft } = useCaptureRouteData();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const currentMode = draft.voice.inputMode;

  return (
    <Form method="post">
      <CapturePageShell
        badge="Step 2"
        description="Choose how voice will enter the system and capture the tonal intent before the real upload or recording pipeline exists."
        footer={<CapturePageActions backTo="/capture/interview" loading={loading} />}
        title="Voice intent"
      >
          <input name="existingSampleFileName" type="hidden" value={draft.voice.sampleFileName} />
          <div className="grid gap-3 md:grid-cols-3">
            <ChoiceCard
              defaultChecked={currentMode === "upload"}
              description="User will provide an existing sample file."
              name="inputMode"
              title="Upload file"
              value="upload"
            />
            <ChoiceCard
              defaultChecked={currentMode === "record"}
              description="User will record directly in the browser later."
              name="inputMode"
              title="Record in app"
              value="record"
            />
            <ChoiceCard
              defaultChecked={currentMode === "later"}
              description="Skip media for now and rely on interview intent."
              name="inputMode"
              title="Decide later"
              value="later"
            />
          </div>

          <Field hint={draft.voice.sampleFileName ? `Current file: ${draft.voice.sampleFileName}` : "Metadata only for now."} label="Voice sample file">
            <Input accept="audio/*" name="sampleFile" type="file" />
          </Field>
          <Field hint="Describe pacing, energy, warmth, sharpness, or emotional tone." label="Tone notes">
            <Textarea defaultValue={draft.voice.toneNotes} name="toneNotes" placeholder="Soft start, crisp articulation, low dramatic variance..." />
          </Field>
          <Field hint="Optional target for later TTS/style transfer." label="Delivery goal">
            <Input defaultValue={draft.voice.deliveryGoal} name="deliveryGoal" placeholder="clear onboarding narrator, calm peer mentor..." />
          </Field>
      </CapturePageShell>
    </Form>
  );
}
