/**
 * Programmatic link between a form control and its validation message: the
 * control is marked invalid and described by the message element, which is
 * rendered by `FieldError` with the same id.
 */
export function fieldErrorId(formId: string, name: string): string {
  return `${formId}-error-${name}`;
}

export function fieldA11yProps(
  errorId: string,
  message: string | null | undefined,
): { "aria-invalid"?: true; "aria-describedby"?: string } {
  return message ? { "aria-invalid": true, "aria-describedby": errorId } : {};
}
