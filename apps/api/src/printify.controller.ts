import { Controller, Get, Headers } from "@nestjs/common";
import { PrintifyService } from "./printify.service";
import { requireAdminToken } from "./admin-auth";

@Controller("printify")
export class PrintifyController {
  constructor(private readonly printify: PrintifyService) {}

  @Get("status")
  status() {
    return this.printify.status();
  }

  @Get("shops")
  async shops(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization)
    return this.printify.shops();
  }

  @Get("products")
  async products(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization)
    return this.printify.products();
  }

}
