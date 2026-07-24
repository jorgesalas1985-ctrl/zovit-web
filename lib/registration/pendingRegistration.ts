import type { IdentityDocumentType } from "@/lib/verification/types";

const DB_NAME = "zovit-registration";
const STORE_NAME = "pending";
const DB_VERSION = 1;

export type StoredRegistrationDocument = {
  document_type: IdentityDocumentType;
  fileName: string;
  contentType: string;
  metadata: Record<string, unknown> | null;
  blob: Blob;
};

export type PendingRegistration = {
  email: string;
  rut: string;
  documents: StoredRegistrationDocument[];
  avatar: StoredRegistrationDocument | null;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "email" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = handler(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Error en IndexedDB"));
      })
  );
}

export async function savePendingRegistration(pending: PendingRegistration): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(pending));
}

export async function loadPendingRegistration(email: string): Promise<PendingRegistration | null> {
  const normalized = email.trim().toLowerCase();
  const result = await runTransaction<PendingRegistration | undefined>("readonly", (store) =>
    store.get(normalized)
  );
  return result ?? null;
}

export async function clearPendingRegistration(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await runTransaction("readwrite", (store) => store.delete(normalized));
}

export async function storeRegistrationDocuments(
  email: string,
  rut: string,
  documents: Array<{
    document_type: IdentityDocumentType;
    file: File;
    metadata?: Record<string, unknown> | null;
  }>,
  avatarFile?: File | null
): Promise<void> {
  const avatar = avatarFile
    ? {
        document_type: "selfie" as IdentityDocumentType,
        fileName: avatarFile.name,
        contentType: avatarFile.type,
        metadata: { kind: "avatar" },
        blob: avatarFile,
      }
    : null;

  await savePendingRegistration({
    email: email.trim().toLowerCase(),
    rut,
    documents: await Promise.all(
      documents.map(async (doc) => ({
        document_type: doc.document_type,
        fileName: doc.file.name,
        contentType: doc.file.type,
        metadata: doc.metadata ?? null,
        blob: doc.file,
      }))
    ),
    avatar,
    createdAt: new Date().toISOString(),
  });
}

export function pendingToRegistrationDocuments(pending: PendingRegistration) {
  return pending.documents.map((doc) => ({
    document_type: doc.document_type,
    file: new File([doc.blob], doc.fileName, { type: doc.contentType }),
    metadata: doc.metadata,
  }));
}

export function pendingToAvatarFile(pending: PendingRegistration): File | null {
  if (!pending.avatar) return null;
  return new File([pending.avatar.blob], pending.avatar.fileName, { type: pending.avatar.contentType });
}

export async function flushPendingRegistration(
  email: string,
  userId: string,
  complete: (
    userId: string,
    rut: string,
    documents: ReturnType<typeof pendingToRegistrationDocuments>,
    avatarFile?: File | null
  ) => Promise<string | null>
): Promise<boolean> {
  const pending = await loadPendingRegistration(email);
  if (!pending) return false;

  const error = await complete(
    userId,
    pending.rut,
    pendingToRegistrationDocuments(pending),
    pendingToAvatarFile(pending)
  );
  if (error) {
    throw new Error(error);
  }

  await clearPendingRegistration(email);
  return true;
}
