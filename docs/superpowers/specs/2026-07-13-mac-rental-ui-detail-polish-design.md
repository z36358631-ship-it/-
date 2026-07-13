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
6. Limit the visible order list to the first three matching orders.
   - When the filtered result contains more than three orders, show a centered `...` overflow indicator after the third order.
   - Keep filtering based on the full order collection.
7. Remove the `全部订单` shortcut from refund and journey page headers.
   - The sidebar return button is the primary way back.
   - Remove other duplicate in-content return buttons where they only repeat the same navigation.

## Interaction And Layout

- Preserve the existing single-file renderer and delegated action model.
- Keep all four period options in one row; increase button height for the secondary price line.
- Keep the three detail actions in one row with stable widths and `white-space: nowrap`.
- Sidebar back navigation must not affect the administration pages.
- The order overflow indicator is informational and must not resize the surrounding order cards.

## Verification

- Verify all Mac and administration renderers still load.
- Verify version switching recalculates all four daily rates.
- Verify the permanent daily rate uses 3650 days and one decimal place.
- Verify sidebar back navigation and fallback routes.
- Verify order filters still work and lists with more than three results show exactly three cards plus `...`.
- Verify journey and refund headers no longer contain the `全部订单` shortcut.
- Capture Explore, game detail, and checkout screenshots and check for wrapping or overlap.
- Run the existing browser smoke test and require `data-smoke-status="pass"`.
