import { useLayoutEffect, useRef } from "react";

type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

export function useTextInputVariableInsertion<T extends TextInputElement>(
  value: string,
  onChange: (nextValue: string) => void
) {
  const inputRef = useRef<T | null>(null);
  const pendingCursorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const cursor = pendingCursorRef.current;
    const input = inputRef.current;
    if (cursor === null || !input) {
      return;
    }
    pendingCursorRef.current = null;
    input.focus();
    input.setSelectionRange(cursor, cursor);
  }, [value]);

  const insert = (text: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange(`${value}${text}`);
      return;
    }
    const hasFocus = document.activeElement === input;
    const start = hasFocus ? input.selectionStart ?? input.value.length : input.value.length;
    const end = hasFocus ? input.selectionEnd ?? start : start;
    pendingCursorRef.current = start + text.length;
    onChange(`${input.value.slice(0, start)}${text}${input.value.slice(end)}`);
  };

  return { inputRef, insert };
}
