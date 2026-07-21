from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(
            f"{path}: expected {count} occurrence(s), found {actual}: {old[:80]!r}"
        )
    file.write_text(text.replace(old, new, count))


# Give a correctly authenticated but unverified user a persistent resend route.
replace(
    "src/components/auth/sign-in-form.tsx",
    '  const [demoStatus, setDemoStatus] = useState("");\n',
    '  const [demoStatus, setDemoStatus] = useState("");\n'
    '  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);\n'
    '  const [verificationStatus, setVerificationStatus] = useState("");\n',
)
replace(
    "src/components/auth/sign-in-form.tsx",
    '  function clearFeedback() {\n'
    '    if (errorMessage) setErrorMessage(null);\n'
    '    if (invalidCredentials) setInvalidCredentials(false);\n'
    '    if (demoStatus) setDemoStatus("");\n'
    '  }\n',
    '  function clearFeedback() {\n'
    '    if (errorMessage) setErrorMessage(null);\n'
    '    if (invalidCredentials) setInvalidCredentials(false);\n'
    '    if (demoStatus) setDemoStatus("");\n'
    '    if (unverifiedEmail) setUnverifiedEmail(null);\n'
    '    if (verificationStatus) setVerificationStatus("");\n'
    '  }\n',
)
replace(
    "src/components/auth/sign-in-form.tsx",
    '  async function handleSubmit(event: FormEvent<HTMLFormElement>) {\n',
    '  async function resendVerification() {\n'
    '    if (!unverifiedEmail) return;\n'
    '    setVerificationStatus("");\n'
    '    setIsSubmitting(true);\n\n'
    '    try {\n'
    '      const result = await authClient.sendVerificationEmail({\n'
    '        email: unverifiedEmail,\n'
    '        callbackURL: returnTo,\n'
    '      });\n'
    '      setVerificationStatus(\n'
    '        result.error\n'
    '          ? "The verification email could not be resent just now. Please try again shortly."\n'
    '          : "A fresh verification email is on its way. Use the newest link within 24 hours.",\n'
    '      );\n'
    '    } catch {\n'
    '      setVerificationStatus(\n'
    '        "The verification email could not be resent just now. Please try again shortly.",\n'
    '      );\n'
    '    } finally {\n'
    '      setIsSubmitting(false);\n'
    '    }\n'
    '  }\n\n'
    '  async function handleSubmit(event: FormEvent<HTMLFormElement>) {\n',
)
replace(
    "src/components/auth/sign-in-form.tsx",
    '      if (result.error) {\n'
    '        setInvalidCredentials(isCredentialError(result.error.status));\n'
    '        setErrorMessage(\n'
    '          getSignInErrorMessage(result.error.status, result.error.code),\n'
    '        );\n'
    '        return;\n'
    '      }\n',
    '      if (result.error) {\n'
    '        const needsVerification =\n'
    '          result.error.code === "EMAIL_NOT_VERIFIED";\n'
    '        setInvalidCredentials(\n'
    '          !needsVerification && isCredentialError(result.error.status),\n'
    '        );\n'
    '        setUnverifiedEmail(needsVerification ? email : null);\n'
    '        setVerificationStatus("");\n'
    '        setErrorMessage(\n'
    '          getSignInErrorMessage(result.error.status, result.error.code),\n'
    '        );\n'
    '        return;\n'
    '      }\n',
)
replace(
    "src/components/auth/sign-in-form.tsx",
    '    return "This account\'s email address has not been verified yet. Use the link in your verification email, or register again to receive a fresh link.";\n',
    '    return "This account\'s email address has not been verified yet. Use the link in your verification email, or request a fresh link below.";\n',
)
replace(
    "src/components/auth/sign-in-form.tsx",
    '      {errorMessage ? (\n'
    '        <p className={styles.error} id={errorId} role="alert">\n'
    '          {errorMessage}\n'
    '        </p>\n'
    '      ) : null}\n\n'
    '      <button className={styles.submit} type="submit" disabled={isSubmitting}>\n',
    '      {errorMessage ? (\n'
    '        <p className={styles.error} id={errorId} role="alert">\n'
    '          {errorMessage}\n'
    '        </p>\n'
    '      ) : null}\n\n'
    '      {unverifiedEmail ? (\n'
    '        <>\n'
    '          <button\n'
    '            type="button"\n'
    '            className={styles.linkButton}\n'
    '            onClick={resendVerification}\n'
    '            disabled={isSubmitting}\n'
    '          >\n'
    '            Resend verification email\n'
    '          </button>\n'
    '          <p className={styles.srStatus} role="status" aria-live="polite">\n'
    '            {verificationStatus}\n'
    '          </p>\n'
    '          {verificationStatus ? (\n'
    '            <p className={styles.status}>{verificationStatus}</p>\n'
    '          ) : null}\n'
    '        </>\n'
    '      ) : null}\n\n'
    '      <button className={styles.submit} type="submit" disabled={isSubmitting}>\n',
)

# Serialize all media mutations through one advisory-lock namespace.
replace(
    "src/modules/businesses/media.ts",
    '      const lockKey = `${input.businessId}:${input.role}`;\n',
    '      const lockKey = `${input.businessId}:media`;\n',
)
replace(
    "src/modules/businesses/media.ts",
    '        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:gallery`}))`,\n',
    '        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:media`}))`,\n',
)

# Avoid duplicate accessible names beside the visible business name.
replace(
    "src/components/business-site-chrome.tsx",
    '              alt={logo.altText || `${tradingName} logo`}\n',
    '              alt=""\n              aria-hidden="true"\n',
)

# Alt text is an accessibility description, not a forced visual caption.
replace(
    "src/components/generated-business-website.tsx",
    '                    {item.altText ? (\n'
    '                      <figcaption>{item.altText}</figcaption>\n'
    '                    ) : null}\n',
    "",
)

# Keep placeholders in private previews but omit empty live sections and nav links.
replace(
    "src/components/generated-business-website.tsx",
    '  const visibleSections = resolveVisibleSections(appearance);\n',
    '  const configuredSections = resolveVisibleSections(appearance);\n'
    '  const visibleSections = embedded\n'
    '    ? configuredSections\n'
    '    : configuredSections.filter((section) => {\n'
    '        switch (section.id) {\n'
    '          case "about":\n'
    '            return Boolean(description?.trim() || projection.summary?.trim());\n'
    '          case "services":\n'
    '            return projection.services.length > 0;\n'
    '          case "gallery":\n'
    '            return media.gallery.length > 0;\n'
    '          case "location":\n'
    '            return Boolean(projection.locationDisplay);\n'
    '          case "hours":\n'
    '            return projection.openingHours.length > 0;\n'
    '        }\n'
    '      });\n',
)
replace(
    "tests/e2e/public-journeys.spec.ts",
    '    await expect(\n'
    '      businessNavigation.getByRole("link", { name: "Gallery" }),\n'
    '    ).toBeVisible();\n',
    '    await expect(\n'
    '      businessNavigation.getByRole("link", { name: "Gallery" }),\n'
    '    ).toHaveCount(0);\n',
)

replace(
    "src/app/dashboard/business/[businessId]/website/page.tsx",
    '    text: "That image is already at the end of the gallery.",\n',
    '    text: "That image is already at that edge of the gallery.",\n',
)
