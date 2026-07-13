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
8. Show the order-detail refund status only after a refund or after-sales refund request exists.
   - Hide the entire refund-status field when `refundStatus` is `none`.
   - Keep review, refunding, refunded, rejected, and release-failed states visible.
   - Let the remaining detail fields reflow without leaving an empty placeholder.
9. Mirror order-list actions in the order-detail page, excluding the `查看详情` action itself.
   - Renting: show one-click launch, renewal, and after-sales/refund application.
   - Pending payment: show the payment action.
   - Refund requested: show the refund-progress action.
   - Use the same order-state conditions as the list so actions cannot disagree between the two views.
10. Use the entire order card as the order-detail entry.
   - Remove the fixed `查看详情` button from the right-side action column.
   - Keep only state-specific business actions in the action column.
   - Make the card keyboard-focusable and expose button semantics.
   - Clicking a nested business-action button must execute that action without also triggering card navigation.
11. Remove the order-detail fulfillment-record panel and use a clear order lifecycle model.
   - Primary states: pending payment, pending fulfillment, renting, ended, closed, and fulfillment failed.
   - `closed` covers 30-minute payment timeout and user cancellation, with the close reason stored separately.
   - Payment failure remains a payment-attempt result while the order stays pending.
   - Conditional after-sales states: processing, refunding, refunded, and closed, with the resolution displayed separately.
12. Move non-rental game interception into the target game-detail page.
   - Remove the standalone guard page from the Mac navigation.
   - Replace `获取游戏` with `安装 783M` for an uninstalled target and `启动游戏` for an installed target.
   - Clicking either action during a rental session opens an interception overlay on the same detail page.
   - The overlay distinguishes install and launch blocking and retains return-to-rental-game, switch-to-personal-account, and end-rental actions.
   - Keep uninstalled and installed demo states available so both interception branches can be verified.

## Interaction And Layout

- Preserve the existing single-file renderer and delegated action model.
- Keep all four period options in one row; increase button height for the secondary price line.
- Keep the three detail actions in one row with stable widths and `white-space: nowrap`.
- Sidebar back navigation must not affect the administration pages.
- The order overflow indicator is informational and must not resize the surrounding order cards.
- Game-detail interception must not create an installation task or game process before AppID validation passes.

## Verification

- Verify all Mac and administration renderers still load.
- Verify version switching recalculates all four daily rates.
- Verify the permanent daily rate uses 3650 days and one decimal place.
- Verify sidebar back navigation and fallback routes.
- Verify order filters still work and lists with more than three results show exactly three cards plus `...`.
- Verify journey and refund headers no longer contain the `全部订单` shortcut.
- Verify an order without a refund request has no refund-status field, while requested refunds still show their current state.
- Verify each order state exposes the same available actions in the list and detail views.
- Verify mouse and keyboard activation on an order card opens its detail page and nested actions do not double-trigger navigation.
- Verify the order detail has no fulfillment-record panel and each primary/after-sales state renders the correct label and actions.
- Verify `安装 783M` and `启动游戏` both open the correct in-page interception overlay during a rental session.
- Capture Explore, game detail, and checkout screenshots and check for wrapping or overlap.
- Run the existing browser smoke test and require `data-smoke-status="pass"`.
