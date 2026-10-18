import { BadRequestException, Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "./prisma.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() body: any) {
    const customerName = String(body.customerName ?? "").trim();
    const customerEmail = String(body.customerEmail ?? "").trim().toLowerCase();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new BadRequestException("A customer name and valid email are required");
    }
    if (!items.length || items.length > 30) throw new BadRequestException("Cart must contain 1–30 items");

    const normalized = items.map((item: any) => ({
      variantId: String(item.variantId ?? ""),
      quantity: Number(item.quantity),
    }));
    if (normalized.some((item: any) => !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      throw new BadRequestException("Each cart item needs a variant and quantity from 1 to 20");
    }

    const variants = await this.prisma.printVariant.findMany({
      where: { id: { in: normalized.map((item: any) => item.variantId) }, active: true, artwork: { status: "PUBLISHED" } },
      include: { artwork: true },
    });
    if (variants.length !== new Set(normalized.map((item: any) => item.variantId)).size) {
      throw new BadRequestException("One or more print options are unavailable");
    }
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const subtotalCents = normalized.reduce((sum: number, item: any) => sum + (byId.get(item.variantId)!.priceCents * item.quantity), 0);
    const orderNumber = `B24-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 5).toUpperCase()}`;

    const order = await this.prisma.customerOrder.create({
      data: {
        orderNumber, customerName, customerEmail,
        shippingAddress: body.shippingAddress ? String(body.shippingAddress) : null,
        shippingCity: body.shippingCity ? String(body.shippingCity) : null,
        shippingRegion: body.shippingRegion ? String(body.shippingRegion) : null,
        shippingPostalCode: body.shippingPostalCode ? String(body.shippingPostalCode) : null,
        shippingCountry: body.shippingCountry ? String(body.shippingCountry) : null,
        subtotalCents, shippingCents: 0, totalCents: subtotalCents,
        items: { create: normalized.map((item: any) => {
          const variant = byId.get(item.variantId)!;
          return { variantId: variant.id, variantName: `${variant.artwork.title} — ${variant.name}`, quantity: item.quantity, unitPriceCents: variant.priceCents };
        }) },
      },
      include: { items: true },
    });
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      paymentEnabled: process.env.STRIPE_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY),
      message: "Order saved. Payment and Printify submission will only be enabled after their credentials and checkout flow are configured.",
    };
  }

  @Get("admin")
  async listAdmin(@Headers("x-admin-key") key: string) {
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) throw new UnauthorizedException("Admin API key is missing or invalid");
    return this.prisma.customerOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
