export type ReportStatus = "pending" | "in_progress" | "resolved";

export type AdminRole = "admin" | "operator";

export interface AdminDoc {
  email: string;
  role: AdminRole;
}

export interface PhotoMetadata {
  url: string;
  latitude: number;
  longitude: number;
  heading: number;
  headingLabel: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  photoMetadata: PhotoMetadata[];
  latitude: number;
  longitude: number;
  address: string;
  heading: number | null;
  headingLabel: string;
  status: ReportStatus;
  createdAt: Date;
  userId: string;
  decibelLevel: number | null;
  archived?: boolean;
}

export interface Message {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  createdAt: Date;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  blocked: boolean;
  loginAttempts: number;
}
