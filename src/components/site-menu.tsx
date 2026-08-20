"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The keys that scroll a page. Space is deliberately absent: focus is always on a control
 * inside the drawer, where Space activates it rather than scrolling, and cancelling it
 * would stop the close button working.
 */
const scrollKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

/**
 * Whether the drawer has scroll of its own to give a gesture. When it does not — which is
 * every approved viewport, the panel being shorter than the window — every scrolling input
 * inside it belongs to the lock as much as one outside it does. `overscroll-behavior` is
 * not enough on its own: measured in Firefox 153, a wheel over a non-scrolling drawer
 * still chained to the page.
 */
function drawerCanScroll(dialog: HTMLDialogElement | null) {
  return dialog !== null && dialog.scrollHeight > dialog.clientHeight;
}

/**
 * VF-49. Whether the interaction that is about to move focus was a keyboard one.
 *
 * A click synthesised from Enter or Space on a button reports `detail === 0`; a pointer
 * click reports 1 or more. It is the only modality signal carried by the event that moves
 * focus, and WebKit needs one: there a programmatic `focus()` matches `:focus-visible`
 * whatever the reader did, where Blink and Gecko suppress it after a pointer click. So
 * tapping the menu open drew the page's `:focus-visible` rule — a 2 px outline, offset
 * 4 px — as a rectangle around the whole close button, its `close` label included.
 * Measured in WebKit 26.5 at 390 x 844: `:focus-visible` true on the close button after
 * a pointer click, false on Chromium 151 and Firefox 153, which is why it was only ever
 * seen on a phone.
 *
 * The ring is aimed rather than removed. `focus({ focusVisible })` states the answer
 * explicitly, so a keyboard user still gets it on the close button and again on the
 * invoker when focus returns, and tabbing to either afterwards restores it as usual.
 */
function wasActivatedByKeyboard(event: MouseEvent<HTMLButtonElement>) {
  return event.detail === 0;
}

export function SiteMenu({ children }: Readonly<{ children: ReactNode }>) {
  const appShellRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement>(null);
  const previousInertRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  const restoreShell = useCallback(function restoreShell() {
    const shell = appShellRef.current;
    if (shell && !previousInertRef.current) shell.removeAttribute("inert");
  }, []);

  function closeMenu(focusVisible: boolean) {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.close();
    dialog.dataset.state = "closed";
    restoreShell();
    setIsOpen(false);
    requestAnimationFrame(() =>
      invokerRef.current?.focus({ focusVisible, preventScroll: true }),
    );
  }

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    const dialog = dialogRef.current;
    const shell = appShellRef.current;
    if (!dialog || !shell || dialog.open) return;
    previousInertRef.current = shell.hasAttribute("inert");
    shell.setAttribute("inert", "");
    // `show()`, not `showModal()`: see the comment on the `<dialog>` below.
    dialog.show();
    dialog.dataset.state = "open";
    setIsOpen(true);
    // `show()` runs HTML's dialog focusing steps itself and lands on the close button —
    // the drawer's first focusable descendant — so this is not what puts focus there.
    // What it does is restate the modality of that focus, which arrived carrying no
    // `FocusOptions` at all. `focus()` on an already-focused element is a no-op, so the
    // `blur()` is what makes the second call take effect.
    const closeButton = closeButtonRef.current;
    closeButton?.blur();
    closeButton?.focus({
      focusVisible: wasActivatedByKeyboard(event),
      preventScroll: true,
    });
  }

  function onDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // A non-modal dialog fires no `cancel` event, so Escape is owned here. The rest of the
    // page is `inert` while the drawer is open, so focus is always inside it and the key
    // always reaches this handler.
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (scrollKeys.has(event.key) && !drawerCanScroll(event.currentTarget)) {
      // The other half of VF-48's lock. `overscroll-behavior` governs gestures, not keys:
      // measured in WebKit 26.5 and Firefox 153, End with focus in the drawer sent the page
      // behind it to the bottom of the document.
      event.preventDefault();
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

  /* VF-48. The page behind the drawer must not scroll while it is open, and on this page
     that lock cannot be a layout one.

     The previous lock made `[data-app-shell]` `position: fixed`, and that costs two things
     at once on iOS 26. A fixed subtree is clipped to the window, so `.chapter-photo-mirror`
     — the ordinary document content that reaches the strips Safari draws its translucent
     bars over — stops reaching them. And taking the page out of flow empties the root
     scroller, which makes the `scroll(root block)` timeline that holds the mirror still
     *inactive*: the animation stops producing a value and the mirror falls back to
     `transform: none`. Measured in WebKit at 390 x 844, scrolled to 2200: the timeline's
     `currentTime` goes null and the mirror's box top moves from -240 px to +393 px. Either
     failure alone empties both strips, and the band the device reported after VF-47 is
     what fills them.

     So the lock refuses the *input* instead, and leaves layout, the scroll offset, the
     scroll container and the scroll timeline exactly as they were. Nothing has to be put
     back on close, which is also why the scroll position can no longer drift. */
  useEffect(() => {
    if (!isOpen) return;
    function blockPageScroll(event: Event) {
      // A gesture inside a drawer that has scroll of its own belongs to the drawer;
      // `overscroll-behavior: contain` in globals.css stops it chaining out to the page
      // when it reaches either end.
      const dialog = dialogRef.current;
      if (drawerCanScroll(dialog) && dialog?.contains(event.target as Node)) return;
      event.preventDefault();
    }
    // Explicitly non-passive: WebKit and Blink both make a `touchmove` listener on
    // `document` passive by default, and a passive listener cannot cancel the scroll.
    const options = { capture: true, passive: false } as const;
    document.addEventListener("touchmove", blockPageScroll, options);
    document.addEventListener("wheel", blockPageScroll, options);
    return () => {
      document.removeEventListener("touchmove", blockPageScroll, options);
      document.removeEventListener("wheel", blockPageScroll, options);
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (!dialog?.open) return;
      dialog.close();
      restoreShell();
    };
  }, [restoreShell]);

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
          onClick={(event) => closeMenu(wasActivatedByKeyboard(event))}
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
