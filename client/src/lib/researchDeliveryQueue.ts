// The prepared file is retained until a verified server ACK. No session token,
// password or signing key is stored here. Reads are scoped to one current report.
export type ResearchBinding = {
  archiveId: string;
  reportRevision: number;
  snapshotSha256: string;
};
export type PendingResearchReport = ResearchBinding & {
  key: string;
  filename: string;
  file?: Blob;
  receiptId?: string;
};
export const researchQueueKey = (id: string, reissued = false) =>
  `${id}:${reissued ? "reissued" : "original"}`;
let opened: Promise<IDBDatabase> | undefined;
function openQueue() {
  if (!opened)
    opened = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("REPORT_QUEUE_UNAVAILABLE"));
        return;
      }
      const request = indexedDB.open("lim-report-sync-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("reports", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("REPORT_QUEUE_UNAVAILABLE"));
      request.onblocked = () => reject(new Error("REPORT_QUEUE_UNAVAILABLE"));
    }).catch(error => {
      opened = undefined;
      throw error;
    });
  return opened;
}
export async function pendingResearchReport(
  key: string
): Promise<PendingResearchReport | undefined> {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reports", "readonly"),
      request = tx.objectStore("reports").get(key);
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = tx.onerror = () =>
      reject(new Error("REPORT_QUEUE_READ_FAILED"));
  });
}
export async function queuePreparedResearchReport(
  binding: ResearchBinding,
  file: File,
  reissued = false
): Promise<PendingResearchReport> {
  const db = await openQueue(),
    key = researchQueueKey(binding.archiveId, reissued);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reports", "readwrite"),
      store = tx.objectStore("reports"),
      request = store.get(key);
    let result: PendingResearchReport;
    request.onsuccess = () => {
      const existing = request.result as PendingResearchReport | undefined;
      if (
        existing &&
        (existing.reportRevision !== binding.reportRevision ||
          existing.snapshotSha256 !== binding.snapshotSha256)
      ) {
        tx.abort();
        return;
      }
      result = existing ?? { ...binding, key, filename: file.name, file };
      if (!existing) store.add(result); // First prepared bytes win across reloads/tabs.
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () =>
      reject(new Error("REPORT_QUEUE_WRITE_FAILED"));
  });
}
export async function acknowledgeResearchReport(
  key: string,
  receiptId: string
) {
  const db = await openQueue();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("reports", "readwrite"),
      store = tx.objectStore("reports"),
      request = store.get(key);
    request.onsuccess = () => {
      if (request.result) {
        const { file: _file, ...meta } =
          request.result as PendingResearchReport;
        store.put({ ...meta, receiptId });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(new Error("REPORT_QUEUE_ACK_FAILED"));
  });
}
