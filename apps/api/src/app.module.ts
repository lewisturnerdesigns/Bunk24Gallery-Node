import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { CatalogController } from "./catalog.controller";
import { OrdersController } from "./orders.controller";
import { PrintifyController } from "./printify.controller";
import { PrintifyService } from "./printify.service";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [AppController, CatalogController, OrdersController, PrintifyController],
  providers: [PrismaService, PrintifyService],
})
export class AppModule {}
