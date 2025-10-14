Short answer: **don’t fork the codebase.** Build a single, responsive app that explicitly targets desktop **and** Pixel 7 Pro. Separate codebases double your bugs and halve your velocity.

Here’s the pragmatic plan, ordered by impact:

# 1) Lock in a mobile-first layout system

* **One column on mobile, two/three on desktop.** Collapse sidebars into a slide-over on small screens.
* Use Tailwind breakpoints (`sm/md/lg`) and container queries for finer control.
* Cap desktop width (`max-w-7xl mx-auto`) so spacing doesn’t explode on ultrawide monitors.

```tsx
// App shell idea
<div className="min-h-[100dvh] grid lg:grid-cols-[280px_1fr]">
  {/* Sidebar */}
  <aside className="hidden lg:block border-r">…</aside>

  {/* Main */}
  <main className="flex flex-col">
    <header className="sticky top-0 z-20 backdrop-blur border-b">…</header>
    <section className="flex-1 overflow-auto p-4 sm:p-6">…</section>
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t pb-[env(safe-area-inset-bottom)]">
      {/* Bottom actions for thumbs */}
    </nav>
  </main>
</div>
```

Key bits:

* `min-h-[100dvh]` fixes the mobile 100vh bug (use **`dvh`**).
* `pb-[env(safe-area-inset-bottom)]` respects Pixel’s gesture area.

# 2) Make touch a first-class citizen

* **Hit-targets ≥ 44×44px** (buttons, checkboxes, icons).
* Increase list density on desktop, **increase line-height** on mobile.
* Replace hover-only affordances with visible or **press** states. Use `@media (hover: hover)` to keep hover niceties without breaking touch.

```css
@media (hover: none) {
  .hover-only { display: none; }
}
```

# 3) Navigation that works in a hand

* Move primary actions to a **bottom bar** on mobile (thumb-reachable), keep sidebar/topbar on desktop.
* Use a **FAB** (floating action button) for “Add Task”.
* Slide-over for filters/details instead of desktop drawers.

# 4) Form + keyboard UX on Android

* Inputs: set types (`type="email"`, `inputMode="numeric"`) so the right keyboard shows up.
* Avoid full-screen modals for long forms; they fight the virtual keyboard. Keep content scrollable and stable.
* Use **`scroll-margin-top`** on anchors so fixed headers don’t cover focused inputs.

# 5) Performance & motion

* Lazy-load heavy panels; code-split routes.
* Prefer subtle, **interruptible** animations (Framer Motion) and respect `prefers-reduced-motion`.
* On lists, consider virtualizing only if they get truly large—mobile CPUs appreciate it.

# 6) Tailwind & config tweaks

* Add container queries for polish:

  ```bash
  npm i -D @tailwindcss/container-queries
  ```

  `tailwind.config.js`

  ```js
  module.exports = {
    theme: { extend: {} },
    plugins: [require('@tailwindcss/container-queries')],
  }
  ```
* Define semantic size tokens (`--space-1 …`) and reuse via Tailwind `theme.extend.spacing` for consistent rhythm across breakpoints.

# 7) Pixel-7-Pro-specific checks (keep it honest)

* **Meta viewport** present (`<meta name="viewport" content="width=device-width, initial-scale=1" />`).
* Test **safe areas** (bottom gestures), **dark mode**, **120 Hz** animations, and **PWA install** if relevant.
* Add Playwright device coverage (no separate codebase—just automated proof):

```ts
// playwright.config.ts (excerpt)
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } }, // close enough to 7 Pro for layout
  ],
  use: { screenshot: 'only-on-failure', trace: 'on-first-retry' }
});
```

Visual guardrails for key screens:

```ts
import { test, expect } from '@playwright/test';
test('mobile layout baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-mobile.png', { animations: 'disabled' });
});
```

# 8) Content & controls adapt, not logic

* **Same components**, different presentation:

  * Desktop: table/grid view, multi-select, keyboard shortcuts.
  * Mobile: list/cards, single-select, big touch targets.
* Gate layout by **breakpoints** or **pointer type** (`@media (pointer: coarse)`), not by duplicating business logic.

# 9) Quick checklist (ship this week)

* [ ] Replace any `h-screen` with `min-h-[100dvh]`.
* [ ] Add bottom nav + FAB on mobile; keep sidebar for `lg+`.
* [ ] Ensure all tappables meet 44px min and have visible focus/press states.
* [ ] Audit forms for input types and keyboard behavior.
* [ ] Add Playwright Pixel 7 project + 2–3 visual baselines for hero screens.
* [ ] Test dark mode, safe areas, and offline (optional PWA).

If you want, tell me where your current layout feels cramped or janky on the Pixel 7 Pro (which screen, what action). I’ll rewrite that component with the mobile/desktop split and give you drop-in TSX.
