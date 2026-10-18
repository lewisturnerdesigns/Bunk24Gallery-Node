import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import { PrintifyService } from "./printify.service";

@Controller("printify")
export class PrintifyController {
  constructor(private readonly printify: PrintifyService) {}

  @Get("status")
  status() {
    return this.printify.status();
  }

  @Get("shops")
  async shops(@Headers("x-admin-key") key: string) {
    this.requireAdmin(key);
    return this.printify.shops();
  }

  @Get("products")
  async products(@Headers("x-admin-key") key: string) {
    this.requireAdmin(key);
    return this.printify.products();
  }

  private requireAdmin(key?: string) {
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException("Admin API key is missing or invalid");
    }
  }
}
