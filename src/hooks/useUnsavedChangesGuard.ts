import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave this page anyway?";

/**
 * Bina save kiye page chhodne par confirm: reload / tab band (beforeunload) aur app ke
 * andar ke links (sidebar, breadcrumb, header). BrowserRouter par React Router ka
 * useBlocker nahi chalta, isliye link clicks capture phase me pakadte hain (React ke
 * Link handler se pehle). Page ke apne buttons (Back waghera) `confirmLeave()` se poochein.
 */
export const useUnsavedChangesGuard = (when: boolean, message: string = DEFAULT_MESSAGE) => {
  const whenRef = useRef(when);
  whenRef.current = when;

  useEffect(() => {
    if (!when) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [when, message]);

  const confirmLeave = useCallback(() => !whenRef.current || window.confirm(message), [message]);
  return { confirmLeave };
};
