import { useState } from "react";
import { useNavigate, useRevalidator } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/common/components";

import { logoutRequest } from "../api";

export function LogoutButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutRequest();
      revalidator.revalidate();
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className={className} disabled={loading} onClick={handleLogout} type="button" variant={variant}>
      {loading ? t("button.loggingOut") : t("button.logout")}
    </Button>
  );
}
