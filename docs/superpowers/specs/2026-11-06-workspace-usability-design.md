# Workspace scrolling and drawing readability

Approved in chat on 2026-11-06: fix all four reported usability problems.

The mouse wheel scrolls the page at full fit; when magnified it scrolls the drawing and chains to the page at its edges. A single finger uses native scrolling, including chaining; two fingers retain drawing pinch zoom. Mouse dragging and keyboard panning remain available. Do not disable browser accessibility zoom.

Keep every engineering command and the full-fit overview. Add a Read dimensions control that focuses a dimension at a minimum 12 CSS pixels where possible, increase drawing zoom to 1600%, and retain Fit / reset. Render only the visible viewport at screen resolution while panning a larger virtual surface; retain current full-sheet print rendering and its memory cap. Explain the controls beside the drawing.

Close all open menu levels on outside pointer interaction or keyboard focus leaving the menu, without stealing focus from the selected destination. Preserve Escape and nested item selection.

Verification: reproduce wheel and touch failures before fixing, then test native scrolling at fit and zoom boundaries, pinch and mouse pan, readable detail rendering and reset, menu dismissal and nested navigation. Run workspace unit tests, TypeScript checks, browser layout/interaction and print tests. Preserve existing uncommitted work; do not commit unrelated changes or publish.
