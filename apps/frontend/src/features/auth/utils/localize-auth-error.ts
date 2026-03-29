type TranslateAuthCopy = (key: string) => string;

export function localizeAuthError(
  rawError: string | null | undefined,
  t: TranslateAuthCopy
): string | null {
  if (!rawError) {
    return null;
  }

  switch (rawError) {
    case "Invalid credentials":
      return t("login.invalidCredentials");
    case "Email not verified — check your inbox":
      return t("login.emailNotVerified");
    case "Email already registered":
      return t("signup.emailAlreadyRegistered");
    default:
      return rawError;
  }
}
