import { Form, useNavigation } from "react-router-dom";

import { Field, Input, Textarea } from "@/common/components";

import { CapturePageActions, CapturePageShell, ChoiceCard } from "../components";
import { useCaptureRouteData } from "../utils/hooks";

export function ImageCapturePage() {
  const { draft } = useCaptureRouteData();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const currentMode = draft.image.inputMode;

  return (
    <Form method="post">
      <CapturePageShell
        badge="Step 3"
        description="Capture image intent, framing, and direction now. The real upload pipeline can plug into the same fields later."
        footer={<CapturePageActions backTo="/capture/voice" loading={loading} />}
        title="Visual references"
      >
          <input name="existingReferenceFileName" type="hidden" value={draft.image.referenceFileName} />
          <div className="grid gap-3 md:grid-cols-3">
            <ChoiceCard
              defaultChecked={currentMode === "upload"}
              description="Use an existing photo or reference image."
              name="inputMode"
              title="Upload reference"
              value="upload"
            />
            <ChoiceCard
              defaultChecked={currentMode === "camera"}
              description="Capture from device camera in a later phase."
              name="inputMode"
              title="Use camera"
              value="camera"
            />
            <ChoiceCard
              defaultChecked={currentMode === "later"}
              description="Proceed with text-only draft for now."
              name="inputMode"
              title="Decide later"
              value="later"
            />
          </div>

          <Field
            hint={draft.image.referenceFileName ? `Current file: ${draft.image.referenceFileName}` : "Only filename metadata is stored in this phase."}
            label="Reference image"
          >
            <Input accept="image/*" name="referenceFile" type="file" />
          </Field>
          <Field hint="Style, mood, era, palette, or artist-adjacent notes." label="Visual direction">
            <Textarea
              defaultValue={draft.image.visualDirection}
              name="visualDirection"
              placeholder="soft editorial portrait, warm neutral palette, restrained contrast..."
            />
          </Field>
          <Field hint="Optional prompt support for pose, crop, angle, and expression." label="Framing notes">
            <Textarea
              defaultValue={draft.image.framingNotes}
              name="framingNotes"
              placeholder="waist-up portrait, eye-level camera, minimal smile, clean background..."
            />
          </Field>
      </CapturePageShell>
    </Form>
  );
}
