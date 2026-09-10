import { parentPort, workerData } from "node:worker_threads";
import { PerformanceStore } from "./store.js";
const store = new PerformanceStore(workerData.filename);
const cleanup = setInterval(() => store.cleanup(), 3600000);
cleanup.unref();
store.cleanup();
parentPort!.on("message", ({ id, method, args }) => {
  try {
    const result =
      method === "ingest"
        ? store.ingest(args[0], args[1])
        : method === "close"
        ? store.close()
        : store.query(args[0], args[1], args[2]);
    parentPort!.postMessage({ id, result });
    if (method === "close") {
      clearInterval(cleanup);
      parentPort!.close();
    }
  } catch (error) {
    parentPort!.postMessage({
      id,
      error: error instanceof Error ? error.message : "storage error",
    });
  }
});
