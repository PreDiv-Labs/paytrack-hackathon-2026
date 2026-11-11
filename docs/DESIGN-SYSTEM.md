# PayTrack visual system

`src/lib/design-system.ts` owns the palette and stable category colors. The root layout exposes these as semantic CSS variables, and charts, grid cells, badges, and progress components consume the same values. Keep new colors here instead of adding page-specific hex values.

`src/app/design-system.css` defines shared typography, controls, cards, navigation, overlays, financial states, responsive refinements, focus outlines, and reduced motion. Existing layout styles retain their structure and now consume the semantic palette. Body text is 15px, navigation and controls 14px, supporting text 12–13px, card headings 18px, and page headings 28–36px. Financial values use tabular numerals. Phone form fields use 16px to avoid automatic input zoom.

Reusable financial primitives live in `src/components/ui/financial.tsx`: `CategoryBadge` uses a category's stable color with readable text; `BudgetProgress` adds a textual state and icon as well as color. Approaching-limit and exceeded states override the bar color without removing the category label. Income uses green, outgoing amounts use red, and comparison-chart expenses use violet. No trend, balance, payment status, or amount is fabricated.

Cards use a white surface, subtle border and shadow, and 20px radius. Most controls use a 10px radius and 44px minimum height. The navy surface is reserved for the primary spending highlight. Copilot user messages use lavender; assistant answers stay white with separately bordered source evidence.

Date inputs and selects remain native browser controls for accessibility and reliable mobile interaction. Their surrounding controls follow the theme; the operating system controls the expanded native picker. Table menus/tooltips and chart tooltips have their own matching theme configuration.

Verified with production compilation, TypeScript, lint, the financial/security test suite, contrast calculations, desktop/tablet/phone previews, and shared dialog/dropdown/empty/error states. No payment or authentication credentials are required for visual previews. Signed-in payment approvals and provider flows must be tested with the account owner; theme verification never initiates a payment.
