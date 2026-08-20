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
    document.body.classList.remove("menu-locked");
    document.body.style.removeProperty("top");
    if (shell && !previousInertRef.current) shell.removeAttribute("inert");
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
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.classList.add("menu-locked");
    dialog.showModal();
    dialog.dataset.state = "open";
    setIsOpen(true);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
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
      <div data-app-shell ref={appShellRef}>
        {/* Safari 26 colours its status bar and toolbar from a `position: fixed` layer
            rather than from `theme-color`; these are that layer, one per window edge.
            They are `opacity: 0` — invisible to the reader, still sampled by the browser.
            See `.chrome-tint` in globals.css. */}
        <div aria-hidden="true" className="chrome-tint" data-edge="top" />
        <div aria-hidden="true" className="chrome-tint" data-edge="bottom" />
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

      <dialog
        aria-labelledby="site-menu-title"
        aria-modal="true"
        className="site-menu"
        data-state="closed"
        id="site-menu"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onKeyDown={keepFocusInside}
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
