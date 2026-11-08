# Task 11 — browser and accessibility QA

Implementation and automated checks ran on 2026-11-02–03, Africa/Cairo.
These are Alfadata screenshots and tests, not original-application screenshots.
Original-image comparison remains `unverified-visual-nonblocking` under the
approved exception.

## Tested matrix

Host: Microsoft Windows 11 Pro, 10.0.26300, build 26300.
Playwright 1.64.1; runtime/font measurements are in
`evidence/task11-browser-runtime.json`.

| Project | Runtime | Coverage |
| --- | --- | --- |
| Chrome Windows | 156.0.8078.74, installed Chrome channel | Desktop, source UI, forms, results, print, DPR2 |
| Edge Windows | 156.0.4314.58, installed Edge channel | Same desktop scenarios |
| Chromium Windows | 156.0.8078.4, bundled runtime | Same desktop scenarios |
| Firefox Windows | 157.0, bundled runtime | Same desktop scenarios |
| WebKit Windows | 27.2, bundled runtime | Same desktop scenarios; explicit dialog-opener focus |
| Android Chrome emulation | Pixel 7 profile, installed Chrome | Mobile viewport, orientation, touch activation, scrolling, zoom, forms, results and print |
| iPhone WebKit emulation | iPhone 13 profile, WebKit | Mobile viewport, orientation, touch activation, scrolling, zoom, forms, results and print |

83 scenarios passed in the full seven-project matrix. Seven additional wide
source-toolbar scenarios passed, one per project. Multi-pointer pinch uses
trusted Chromium touch injection; other engine checks include touch activation
and pointer/mouse panning. Mobile emulation is not an actual-device pass.

Tahoma and Verdana were available in all five Windows browser runtimes, measured
against a monospace fallback. No drawing-font fallback was observed on this
host. Emulation uses the host fonts; it does not prove font availability on a
physical phone. Drawing Point units convert at 96/72 logical pixels before DPR
and viewport scaling; Pixel units retain their size.

## Scenarios and visual review

- Source menus, family tabs, saved navigation/history, settings cancellation,
  search, About, parameters, calculator input and rejected-input messages.
- Disabled class400, source-hidden controls, unavailable headers/white drawing,
  unit/fraction changes, stale and foreign-workspace response rejection.
- Semantic table headers/captions, labeled forms, live result/error messages,
  keyboard panel controls, modal cancellation/focus restoration, truthful
  clipboard denial and selectable manual-copy text. Copy/panel actions do not
  issue engineering actions.
- Logical layout remains fixed and scrollable on narrow screens. View zoom/pan
  does not change engineering selections, coordinates or formatting.
- Width650 immutable print snapshot, source viewport transform, hidden
  menu/status strips and Label7, notice outside the drawing, cancellation,
  thrown print errors and nonblocking print-host lifecycle restoration.
- Source runtime navigation widths220/270/275/400, single-counter visibility,
  Gpas4 toolbar restrictions, WhiteBlock/no-dispatch prior-state retention and
  codec replay. The canonical recipe control coordinates use a220px navigation
  baseline; the renderer translates that group by navigationWidth-220. Canvas
  coordinates are unchanged.

Reviewed desktop/wide-toolbar, narrow phone and print screenshots in
`evidence/checkpoints/task11-*.png`. The narrow drawing is intentionally panned,
not wrapped. The results table and reference-use notice remain outside that
geometry. Print drawing and footer fit the650px logical print width.

## Limits and handoff

Manual screen-reader testing was **not performed**. Automated semantic HTML,
keyboard, live-message and focus checks are not a screen-reader certification.
A manual screen-reader/browser matrix remains for delivery Task21.

Physical Android Chrome was not tested. Physical iPhone Safari was not tested;
the approved waiver accepts WebKit/mobile emulation without purchasing or
borrowing an iPhone. This does not claim universal Safari/device compatibility.
Full-product acceptance and additional device/print coverage remain Task21.

The deployable `/workspace` route fails closed until plan2 supplies real
identity/access and workspace-session loading. The managed loopback harness
executes the complete product Workspace; it is not a production auth bypass.
Its historical filename is retained to preserve the Task6a checkpoint:

```powershell
$env:LEGACY_CULTURE='en-US'
node --conditions=react-server --import tsx tools/checkpoints/flan1-server.ts
```

Open http://127.0.0.1:3186. The harness binds only loopback, checks Host/Origin,
uses an HttpOnly SameSite session plus CSRF token, limits action payloads,
validates public actions/results and rejects private file paths. It rejects
production startup.

Future engineering gateways must call `advanceWorkspaceUi(previous,result)`
after the transition and before public projection/commit. Source strip state
is held in scalar private codec fields, not sent as raw state. Existing older
persistent UI states would need explicit replay/reinitialization; this project
has no persisted operation receipts yet. Receipt replay must use the same
strict `parsePublicWorkResult` schema as new output.

The source Srrb3 route has no third Basket title-list entry. Its original prior
caption is retained separately from the two menu choices; the strict contract
does not invent a replacement title or reject that route. Final source-state
and all-route projection tests cover this exception.
