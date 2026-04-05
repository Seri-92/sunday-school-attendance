export function createSingleFlight() {
  let isRunning = false;

  return async function runSingleFlight<T>(task: () => Promise<T>) {
    if (isRunning) {
      return undefined;
    }

    isRunning = true;

    try {
      return await task();
    } finally {
      isRunning = false;
    }
  };
}
