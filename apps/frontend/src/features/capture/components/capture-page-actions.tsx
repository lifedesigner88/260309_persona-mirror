import { NavLink } from "react-router-dom";

import { Button, CardFooter } from "@/common/components";

export function CapturePageActions({
  backTo,
  loading,
  submitLabel = "Save and continue",
  loadingLabel = "Saving...",
  backLabel = "Back",
}: {
  backTo: string;
  loading: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  backLabel?: string;
}) {
  return (
    <CardFooter className="justify-between gap-3">
      <NavLink to={backTo}>
        <Button type="button" variant="outline">
          {backLabel}
        </Button>
      </NavLink>
      <Button disabled={loading} type="submit">
        {loading ? loadingLabel : submitLabel}
      </Button>
    </CardFooter>
  );
}
