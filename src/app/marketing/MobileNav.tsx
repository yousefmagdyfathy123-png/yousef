'use client';

import { useId, useRef, useState, type MouseEvent } from 'react';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  function selectDestination(event: MouseEvent<HTMLAnchorElement>) {
    // Retain native modified-click/new-tab behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(event.currentTarget.href);
    setOpen(false);
    if (url.pathname === location.pathname && url.hash) {
      const destination = document.getElementById(url.hash.slice(1));
      // Homepage section headings/containers supply tabIndex=-1.
      destination?.focus({ preventScroll: true });
    }
  }

  return <div className="public-mobile-nav" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
    }
  }}>
    <button ref={button} type="button" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)}>Menu</button>
    <nav id={id} aria-label="Mobile navigation" hidden={!open}>
      <a href="/#features" onClick={selectDestination}>Features</a>
      <a href="/#example" onClick={selectDestination}>Example</a>
      <a href="/pricing" onClick={selectDestination}>Pricing</a>
      <a href="/sign-in" onClick={selectDestination}>Sign in</a>
      <a className="public-trial" href="/sign-up" onClick={selectDestination}>Start free trial</a>
    </nav>
  </div>;
}
