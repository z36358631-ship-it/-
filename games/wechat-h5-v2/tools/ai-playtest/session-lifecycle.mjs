export const PLAYTEST_TRACING_OPTIONS = Object.freeze({
  screenshots: false,
  snapshots: true,
  sources: false,
});

export function createTerminalErrorRecorder() {
  const errors = [];
  return {
    errors,
    record(error) {
      errors.push(error instanceof Error ? error.message : String(error));
    },
  };
}

export async function closePlaytestResources(resources, recordError = () => {}) {
  for (const [label, resource] of [
    ["page", resources.page],
    ["context", resources.context],
    ["browser", resources.browser],
  ]) {
    if (!resource?.close) continue;
    try {
      await resource.close();
    } catch (error) {
      recordError(
        new Error(
          `AI_PLAYTEST_CLOSE_${label.toUpperCase()}:`
          + `${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        ),
      );
    }
  }
}

function initializationError(stage, error) {
  return new Error(
    `AI_PLAYTEST_INITIALIZATION_${stage.toUpperCase()}:`
    + `${error instanceof Error ? error.message : String(error)}`,
    { cause: error },
  );
}

export async function runSessionLifecycle({
  launch,
  contextOptions = {},
  configurePage = async () => {},
  execute = async () => undefined,
  stopTracing = async ({ context }) => context.tracing.stop(),
  recordError = () => {},
}) {
  const resources = {
    browser: null,
    context: null,
    page: null,
    tracingAttempted: false,
    tracingStarted: false,
  };
  let stage = "launch";
  let initialized = false;
  let result;
  let executionError = null;
  let traceError = null;
  let pendingInitializationError = null;
  const cleanupErrors = [];
  const recordCleanupError = (error) => {
    cleanupErrors.push(error);
    recordError(error);
  };
  try {
    resources.browser = await launch();
    stage = "context";
    resources.context = await resources.browser.newContext(contextOptions);
    stage = "page";
    resources.page = await resources.context.newPage();
    stage = "configure_page";
    await configurePage(resources.page);
    stage = "tracing";
    resources.tracingAttempted = true;
    await resources.context.tracing.start(PLAYTEST_TRACING_OPTIONS);
    resources.tracingStarted = true;
    initialized = true;
    try {
      result = await execute({
        browser: resources.browser,
        context: resources.context,
        page: resources.page,
      });
    } catch (error) {
      executionError = error;
      recordError(error);
    }
  } catch (error) {
    pendingInitializationError = initialized
      ? error
      : initializationError(stage, error);
  } finally {
    if (resources.tracingAttempted) {
      try {
        await stopTracing({
          browser: resources.browser,
          context: resources.context,
          page: resources.page,
        });
      } catch (error) {
        traceError = error;
        recordCleanupError(error);
      }
    }
    await closePlaytestResources(resources, recordCleanupError);
  }
  if (pendingInitializationError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [pendingInitializationError, ...cleanupErrors],
      pendingInitializationError.message,
      { cause: pendingInitializationError },
    );
  }
  if (pendingInitializationError) throw pendingInitializationError;
  return {
    result,
    executionError,
    traceError,
    tracingAttempted: resources.tracingAttempted,
    tracingStarted: resources.tracingStarted,
  };
}
