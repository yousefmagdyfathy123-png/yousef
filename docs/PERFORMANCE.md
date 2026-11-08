# Task 21a performance measurements

Run with `npm run perf:baseline` and `npm run perf:load`. Both use the protected production build on loopback HTTPS, an isolated embedded PostgreSQL test database, synthetic accounts, and the auth test fixture's local SMTP and trial registry. External database and payment providers are outside the load profile.

The browser baseline includes one first observed journey, three warmups, and 15 measured journeys. It asserts the Flan1 reference value, class change, source-backed first elbow search hit, and committed revision after reload. Browser action-to-DOM timing includes two animation frames and Playwright overhead. Browser request start to first response byte includes both server work and loopback overhead. Body bytes exclude headers.

The initial bounded capacity test uses independent accounts and workspaces in one headless Chrome process. It stages 1, 2 and 4 clients. Each stage allows at most 24 requests total and 30 seconds. There is no automatic retry. A failed HTTP or semantic assertion stops the profile. The driver stops admitting requests if host free physical RAM falls below 384 MiB or recent host CPU busy time exceeds 95%. One in-flight batch can finish, with an individual request deadline of 8 seconds. A stopped stage is recorded separately from a completed stage. These are runner safety limits.

The operation mix alternates Flan1 class 300 and 600 through protected workspace actions. The database samples live serialized sizes, heap and index allocation, and estimated dead tuples before and after each stage. WAL position delta includes activity on the isolated PostgreSQL instance. Chrome timing and host counters are reported separately from PostgreSQL storage. These measurements describe this Windows workstation and loopback setup.

Budget thresholds are pending measured target review.

The receipt-window test applies 2,000 operations to the real PostgreSQL receipt transaction using an injected deterministic transition. It checks row count, cursor width and sequence endpoints after every commit, then checks retained replay and denial of an evicted sequence after logical restoration. This isolates the receipt store from calculation time. Logical JSON export size is recorded separately from the allocated heap, index, total relation and WAL deltas. Full deployment backup and restore verification remains part of Task 22.

The production browser fixture also restarts the Next.js child once while preserving its isolated database, auth secret and registry. It verifies a new tab can explicitly resume the last workspace. The child process writes one memory sample per second only during performance runs. Reported restart timings are one observation.
