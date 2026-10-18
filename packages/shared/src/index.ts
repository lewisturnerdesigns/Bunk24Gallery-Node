export type ArtworkStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type OrderStatus = "PENDING" | "PAID" | "FULFILLING" | "SHIPPED" | "CANCELLED" | "REFUNDED";

export interface ArtworkSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  status: ArtworkStatus;
  imageUrl?: string | null;
  createdAt: string;
}
