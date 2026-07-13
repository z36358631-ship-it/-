# Mac Rental UI Detail Polish Design

## Scope

Only update `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`. Do not modify the six source Mac pages.

## Confirmed Changes

1. Rename the Explore page section from `编辑推荐` to `每日推荐`, including its annotation copy.
2. Keep the three game-detail actions in one horizontal row. Button labels must not wrap.
3. Show every rental period option on two lines:
   - First line: `3天`, `7天`, `30天`, or `永久`.
   - Second line: `x.x元/天`.
4. Calculate the displayed daily rate from the selected version price:
   - 3-day price / 3.
   - 7-day price / 7.
   - 30-day price / 30.
   - Permanent price / 3650, treating permanent as 10 years.
   - Always display one decimal place.
5. Replace the first Mac sidebar icon with a left-arrow return button.
   - Use the previous business page when available.
   - Use deterministic fallback routes for direct page entry.
   - Disable the button on the Explore root page when there is no previous page.
   - Remove duplicate return buttons from journey page content.

## Interaction And Layout

- Preserve the existing single-file renderer and delegated action model.
- Keep all four period options in one row; increase button height for the secondary price line.
- Keep the three detail actions in one row with stable widths and `white-space: nowrap`.
- Sidebar back navigation must not affect the administration pages.

## Verification

- Verify all Mac and administration renderers still load.
- Verify version switching recalculates all four daily rates.
- Verify the permanent daily rate uses 3650 days and one decimal place.
- Verify sidebar back navigation and fallback routes.
- Capture Explore, game detail, and checkout screenshots and check for wrapping or overlap.
- Run the existing browser smoke test and require `data-smoke-status="pass"`.
