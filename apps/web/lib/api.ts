const API_BASE = (process.env.API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export type PrintVariant = {
  id: string;
  name: string;
  priceCents: number;
  widthInches?: string | number | null;
  heightInches?: string | number | null;
};

export type Artwork = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  featured: boolean;
  variants: PrintVariant[];
};

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
