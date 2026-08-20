"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function SiteMenu({ children }: Readonly<{ children: ReactNode }>) {
  const appShellRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement>(null);
  const previousInertRef = useRef(false);
  const scrollYRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const restorePage = useCallback(function restorePage() {
    const shell = appShellRef.current;
    if (shell) {
      delete shell.dataset.scrollLocked;
      shell.style.removeProperty("top");
      if (!previousInertRef.current) shell.removeAttribute("inert");
    }
    window.scrollTo(0, scrollYRef.current);
  }, []);

  function closeMenu() {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.close();
    dialog.dataset.state = "closed";
    restorePage();
    setIsOpen(false);
    requestAnimationFrame(() => invokerRef.current?.focus({ preventScroll: true }));
  }

  function openMenu() {
    const dialog = dialogRef.current;
    const shell = appShellRef.current;
    if (!dialog || !shell || dialog.open) return;
    scrollYRef.current = window.scrollY;
    previousInertRef.current = shell.hasAttribute("inert");
    shell.setAttribute("inert", "");
    // The lock is on the shell, not on `<body>`: a fixed `<body>` is a window-sized fixed
    // box and Safari 26 fills both browser bars from it. See `[data-scroll-locked]` in
    // globals.css.
    shell.style.top = `-${scrollYRef.current}px`;
    shell.dataset.scrollLocked = "";
    // `show()`, not `showModal()`: see the comment on the `<dialog>` below.
    dialog.show();
    dialog.dataset.state = "open";
    setIsOpen(true);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  function onDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // A non-modal dialog fires no `cancel` event, so Escape is owned here. The rest of the
    // page is `inert` while the drawer is open, so focus is always inside it and the key
    // always reaches this handler.
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    ].filter((element) => !element.hidden && element.getClientRects().length > 0);
    if (focusable.length === 0) {
      event.preventDefault();
      closeButtonRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (!dialog?.open) return;
      dialog.close();
      restorePage();
    };
  }, [restorePage]);

  return (
    <>
      {/* Safari 26 fills its status bar and toolbar from a `position: fixed` layer at the
          window edge, which the pinned chapter plate would otherwise supply. These two
          boxes take the edge hit test and fail it, so the bars keep the photograph behind
          them instead of a band of colour. See `.chrome-shield` in globals.css.

          They sit OUTSIDE the app shell because the shell is made `inert` while the drawer
          is open, and WebKit reports an inert box as `pointer-events: none`
          (`RenderStyle::usedPointerEvents()`) — the one property the edge sampler's retry
          pass honours. Both boxes are `position: fixed`, so nothing about where they are
          declared changes what they paint, which is nothing. */}
      <div aria-hidden="true" className="chrome-shield" data-edge="top" />
      <div aria-hidden="true" className="chrome-shield" data-edge="bottom" />

      <div data-app-shell ref={appShellRef}>
        {children}
        <button
          aria-label="メニューを開く"
          aria-controls="site-menu"
          aria-expanded={isOpen}
          className="menu-open-button"
          data-fidelity-action="open-menu"
          onClick={openMenu}
          ref={invokerRef}
          type="button"
        >
          <span
            aria-hidden="true"
            className="menu-control-visual"
            data-fidelity="menu-control-visual"
          >
            <span className="menu-word">menu</span>
            <span className="menu-grid">
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} />
              ))}
            </span>
          </span>
        </button>
      </div>

      {/* Opened with `show()` rather than `showModal()`, and the modality is supplied by the
          `inert` on the app shell above plus the focus trap below.

          `showModal()` puts the drawer in the top layer, which is painted and hit-tested
          above every z-index on the page — including `.chrome-shield`. On a phone the panel
          is 250 px of a 390 px window, so it covers the midpoint of both window edges, which
          is the single point Safari 26's `fixedContainerEdges()` hit-tests; being full-height
          and part-width it then classifies as `IsSidebar`, a candidate, and both browser bars
          filled with `--olive-aa` for as long as the menu was open. Out of the top layer the
          drawer takes its declared `z-index: 100`, the shields keep their 120, and the bars
          stay translucent in both states. Recorded as VF-47; the limitation it removes is
          docs/ios26-tint-root-cause.md §9, first bullet.

          Nothing else is lost: `::backdrop` was already transparent, the focus trap, the
          scroll lock and the `inert` were all already hand-rolled here, and Escape — which a
          modal dialog would have delivered as `cancel` — is handled in `onDialogKeyDown`. */}
      <dialog
        aria-labelledby="site-menu-title"
        aria-modal="true"
        className="site-menu"
        data-state="closed"
        id="site-menu"
        onKeyDown={onDialogKeyDown}
        ref={dialogRef}
      >
        <button
          aria-label="メニューを閉じる"
          className="menu-close-button"
          data-fidelity-action="close-menu"
          onClick={closeMenu}
          ref={closeButtonRef}
          type="button"
        >
          <span aria-hidden="true" />
          <small>close</small>
        </button>
        <div className="menu-content">
          <h2 id="site-menu-title">ABOUT</h2>
          <p>MOYOYについて</p>
          <h2>PRODUCT</h2>
          <p>製品情報</p>
          <ul aria-label="フレグランス一覧">
            <li>ROOT</li>
            <li>DUSK</li>
            <li>DAWN</li>
            <li>ALPINE</li>
          </ul>
          <div className="menu-muted" aria-label="リンク先未確定のため非操作">
            <p>Instagram</p>
            <p>Online Shop</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
