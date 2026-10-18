import { Injectable, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class PrintifyService {
  private get token() { return process.env.PRINTIFY_API_TOKEN?.trim(); }
  private get shopId() { return process.env.PRINTIFY_SHOP_ID?.trim(); }

  status() {
    return {
      configured: Boolean(this.token && this.shopId),
      shopConfigured: Boolean(this.shopId),
      tokenConfigured: Boolean(this.token),
      syncEnabled: Boolean(this.token && this.shopId),
      note: this.token && this.shopId
        ? "Credentials are present. Verify the connected shop before enabling live order submission."
        : "Add PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID to the root .env file to connect Printify.",
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
}
