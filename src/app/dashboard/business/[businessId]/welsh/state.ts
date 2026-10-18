import type { TranslationFormErrors } from "@/modules/businesses/translation-model";

export type WelshFormValues = {
  summary: string;
  description: string;
  services: Record<string, { name: string; description: string }>;
  offers: Record<string, { title: string; description: string }>;
};

export type WelshFormState = {
  status:
    "idle" | "saved" | "cleared" | "invalid" | "forbidden" | "unavailable";
  errors: TranslationFormErrors;
  /** What the owner typed, echoed back so a failed save loses nothing. */
  values: WelshFormValues | null;
};

export const idleWelshFormState: WelshFormState = {
  status: "idle",
  errors: { services: {}, offers: {} },
  values: null,
};
