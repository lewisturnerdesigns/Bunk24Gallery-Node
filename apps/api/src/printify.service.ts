import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";

type PrintifyProduct = { id?: string | number; [key: string]: any };

@Injectable()
export class PrintifyService {
  private get token() { return process.env.PRINTIFY_API_TOKEN?.trim(); }
  private get shopId() { return process.env.PRINTIFY_SHOP_ID?.trim(); }

  status() {
    const configured = Boolean(this.token && this.shopId);
    return {
      configured,
      shopConfigured: Boolean(this.shopId),
      tokenConfigured: Boolean(this.token),
      catalogImportEnabled: configured,
      // Deliberately hard-disabled. This integration does not submit orders to Printify.
      syncEnabled: false,
      orderSubmissionEnabled: false,
      note: configured
        ? "Read-only catalog access is configured. Imports create BUNK24 drafts only; Printify order submission is disabled."
        : "Add PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID to the root .env file to enable read-only catalog access. Order submission remains disabled.",
    };
  }

  async shops() {
    if (!this.token) throw new ServiceUnavailableException("Printify is not configured. Add PRINTIFY_API_TOKEN to .env.");
    const response = await fetch("https://api.printify.com/v1/shops.json", {
      headers: { Authorization: `Bearer ${this.token}`, "User-Agent": "BUNK24-Gallery/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new ServiceUnavailableException(`Printify shops request failed with status ${response.status}`);
    return response.json();
  }

  async products() {
    if (!this.token || !this.shopId) throw new ServiceUnavailableException("Configure PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID first.");
    const response = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(this.shopId)}/products.json`, {
      headers: { Authorization: `Bearer ${this.token}`, "User-Agent": "BUNK24-Gallery/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new ServiceUnavailableException(`Printify products request failed with status ${response.status}`);
    return response.json();
  }

  async productById(productId: string): Promise<PrintifyProduct> {
    const payload: any = await this.products();
    const list: PrintifyProduct[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    const product = list.find((item) => String(item.id ?? "") === productId);
    if (!product) throw new NotFoundException("Printify product was not found in the configured shop.");
    return product;
  }
}
