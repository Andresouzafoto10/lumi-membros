// Radix Dialog/AlertDialog v1.1.x has a known issue where body scroll-lock
// styles (overflow:hidden, padding-right, pointer-events:none, data-scroll-locked)
// can persist after a Dialog closes when nested popovers/selects/MDEditor were
// active. This leaves the page un-scrollable. Call from onCloseAutoFocus to force-reset.
export function clearDialogBodyLock() {
  if (typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const body = document.body;
    if (!body) return;
    body.style.pointerEvents = "";
    // Only reset overflow/padding if no other Radix dialog is still open.
    const stillOpen = document.querySelector(
      "[data-radix-popper-content-wrapper], [data-state=open][role=dialog], [data-state=open][role=alertdialog]"
    );
    if (!stillOpen) {
      body.style.overflow = "";
      body.style.paddingRight = "";
      body.removeAttribute("data-scroll-locked");
    }
  });
}
