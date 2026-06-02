import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Report, ReportStatus } from "../types";

function docToReport(d: { id: string; data: () => Record<string, unknown> }): Report {
  const data = d.data();
  return {
    id: d.id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    category: (data.category as string) ?? "",
    imageUrls: Array.isArray(data.imageUrls)
      ? (data.imageUrls as string[])
      : data.imageUrl
      ? [data.imageUrl as string]
      : [],
    photoMetadata: Array.isArray(data.photoMetadata)
      ? (data.photoMetadata as Report["photoMetadata"])
      : [],
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    address: (data.address as string) ?? "",
    heading: data.heading != null ? Number(data.heading) : null,
    headingLabel: (data.headingLabel as string) ?? "",
    status: ((data.status as string) ?? "pending") as ReportStatus,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    userId: (data.userId as string) ?? "",
    decibelLevel: data.decibelLevel != null ? Number(data.decibelLevel) : null,
    archived: (data.archived as boolean) ?? false,
  };
}

export function subscribeAllReports(
  callback: (reports: Report[]) => void
): () => void {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToReport).filter((r) => !r.archived));
  });
}

export function subscribeArchivedReports(
  callback: (reports: Report[]) => void
): () => void {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToReport).filter((r) => r.archived === true));
  });
}

export async function archiveReport(id: string): Promise<void> {
  await updateDoc(doc(db, "reports", id), { archived: true });
}

export async function unarchiveReport(id: string): Promise<void> {
  await updateDoc(doc(db, "reports", id), { archived: false });
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<void> {
  await updateDoc(doc(db, "reports", id), { status });
}

export async function sendStatusNotification(
  userId: string,
  reportId: string,
  reportTitle: string,
  newStatus: ReportStatus
): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    type: "status_change",
    userId,
    reportId,
    reportTitle,
    newStatus,
    createdAt: serverTimestamp(),
    sent: false,
  });
}

export async function sendFeedbackNotification(
  userId: string,
  reportId: string,
  reportTitle: string,
  messageText: string
): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    type: "feedback",
    userId,
    reportId,
    reportTitle,
    messageText,
    createdAt: serverTimestamp(),
    sent: false,
  });
}
