function visibleProjection() {
  const selector = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "[role=button]",
    "[tabindex]",
  ].join(",");
  const rectOf = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  };
  const isVisible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const viewportWidth =
      document.documentElement?.clientWidth ?? window.innerWidth;
    const viewportHeight =
      document.documentElement?.clientHeight ?? window.innerHeight;
    const layoutRects = element.getClientRects();
    return (
      style.display !== "none"
      && style.visibility !== "hidden"
      && style.visibility !== "collapse"
      && Number(style.opacity) > 0
      && layoutRects.length > 0
      && rect.width > 0
      && rect.height > 0
      && rect.x + rect.width > 0
      && rect.y + rect.height > 0
      && rect.x < viewportWidth
      && rect.y < viewportHeight
    );
  };

  return {
    text: document.body?.innerText ?? "",
    controls: [...document.querySelectorAll(selector)]
      .filter(isVisible)
      .map((element, index) => ({
        controlId: `control-${index + 1}`,
        label:
          element.innerText || element.getAttribute("aria-label") || "",
        enabled: !element.matches(":disabled,[aria-disabled=true]"),
        rect: rectOf(element),
      })),
  };
}

function requiredFunction(owner, property, code) {
  if (!owner || typeof owner[property] !== "function") {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
}

function safeErrorCode(error) {
  if (
    error
    && typeof error.code === "string"
    && /^[A-Z][A-Z0-9_]*$/u.test(error.code)
  ) {
    return error.code;
  }
  return "AI_DRIVER_TOUCH_FAILED";
}

function definedRecord(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

export function createBrowserTouchAdapter({
  page,
  cdp,
  writeAction,
  now = Date.now,
}) {
  requiredFunction(page, "screenshot", "AI_DRIVER_PAGE_REQUIRED");
  requiredFunction(page, "evaluate", "AI_DRIVER_PAGE_REQUIRED");
  requiredFunction(page?.touchscreen, "tap", "AI_DRIVER_TOUCHSCREEN_REQUIRED");
  requiredFunction(cdp, "send", "AI_DRIVER_CDP_REQUIRED");
  if (typeof writeAction !== "function") {
    const error = new Error("AI_DRIVER_ACTION_WRITER_REQUIRED");
    error.code = "AI_DRIVER_ACTION_WRITER_REQUIRED";
    throw error;
  }

  const auditTouch = async (type, input, perform) => {
    const requestedAt = input.requestedAt ?? now();
    const executedAt = now();
    let operationError = null;
    let result = "failure";
    try {
      const value = await perform();
      result = "success";
      return value ?? { ok: true };
    } catch (error) {
      operationError = error;
      throw error;
    } finally {
      const record = definedRecord({
        schemaVersion: 1,
        type,
        actionId: input.actionId,
        requestSeq: input.requestSeq,
        frameSeq: input.frameSeq,
        gestureId: input.gestureId,
        x: input.x,
        y: input.y,
        requestedAt,
        executedAt,
        completedAt: now(),
        result,
        errorCode:
          operationError ? safeErrorCode(operationError) : undefined,
      });
      try {
        await writeAction(record);
      } catch (auditError) {
        if (!operationError) throw auditError;
        const aggregate = new AggregateError(
          [operationError, auditError],
          "AI_DRIVER_TOUCH_AUDIT_FAILED",
        );
        aggregate.code = "AI_DRIVER_TOUCH_AUDIT_FAILED";
        aggregate.status = 500;
        throw aggregate;
      }
    }
  };

  return Object.freeze({
    capture: () => page.screenshot({ type: "png" }),
    visible: () => page.evaluate(visibleProjection),
    touchTap: (input) => auditTouch(
      "touchTap",
      input,
      () => page.touchscreen.tap(input.x, input.y),
    ),
    touchBegin: (input) => auditTouch(
      "touchBegin",
      input,
      () => cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: input.x, y: input.y }],
      }),
    ),
    touchMove: (input) => auditTouch(
      "touchMove",
      input,
      () => cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: input.x, y: input.y }],
      }),
    ),
    touchEnd: (input) => auditTouch(
      "touchEnd",
      input,
      () => cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      }),
    ),
    touchCancel: (input) => auditTouch(
      "touchCancel",
      input,
      () => cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      }),
    ),
  });
}
