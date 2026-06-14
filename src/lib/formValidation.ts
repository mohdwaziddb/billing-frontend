import type { FieldErrors, FieldValues } from "react-hook-form";

export const firstFormErrorMessage = <T extends FieldValues>(errors: FieldErrors<T>, fallback = "Please fill all required fields before saving.") => {
  const stack: unknown[] = Object.values(errors);
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") {
      continue;
    }
    const record = current as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    stack.push(...Object.values(record));
  }
  return fallback;
};
