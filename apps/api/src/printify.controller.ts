import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { PrintifyService } from "./printify.service";
import { PrismaService } from "./prisma.service";
import { requireAdminToken } from "./admin-auth";

@Controller("printify")
export class PrintifyController {
  constructor(
    private readonly printify: PrintifyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("status")
  status() {
    return this.printify.status();
  }

  @Get("shops")
  async shops(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization);
    return this.printify.shops();
  }

  @Get("products")
  async products(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization);
    return this.printify.products();
  }

  /**
   * Imports a Printify product into the BUNK24 database as a DRAFT.
   * This route only reads from Printify. It never creates or updates anything there.
   * Re-importing an existing product is intentionally a no-op to preserve BUNK24 edits.
   */
  @Post("import/:productId")
  async importDraft(
    @Headers("authorization") authorization: string,
    @Param("productId") productId: string,
    @Body() _body: any,
  ) {
    requireAdminToken(authorization);
    if (!productId || productId.length > 128) {
      throw new BadRequestException("A valid Printify product ID is required.");
    }

    const existing = await this.prisma.artwork.findUnique({ where: { printifyProductId: productId } });
    if (existing) {
      return { imported: false, alreadyImported: true, artwork: existing, message: "Already imported. Existing BUNK24 edits were left unchanged." };
    }

    const product: any = await this.printify.productById(productId);
    const providerVariants: any[] = Array.isArray(product.variants) ? product.variants : [];
    const variants = providerVariants
      .filter((variant) => variant?.id != null && Number.isInteger(Number(variant.price)) && Number(variant.price) > 0)
      .map((variant) => {
        const providerCostCents = Number(variant.price);
        // Conservative starting suggestion only; an admin must review retail prices before publishing.
        const suggestedRetailCents = Math.max(1000, Math.ceil((providerCostCents * 2) / 100) * 100);
        return {
          name: String(variant.title || variant.name || "Print option").slice(0, 191),
          priceCents: suggestedRetailCents,
          active: variant.is_enabled !== false && variant.is_available !== false,
          printifyVariantId: String(variant.id),
        };
      });

    if (!variants.length) {
      throw new BadRequestException("This product has no variants with valid prices. Nothing was imported.");
    }

    const title = String(product.title || "Untitled Print").trim().slice(0, 160) || "Untitled Print";
    const slugBase = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "print";
    const idSuffix = productId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-10) || "import";
    const image = Array.isArray(product.images)
      ? product.images.find((item: any) => item?.is_default && item?.src) || product.images.find((item: any) => item?.src)
      : null;

    const artwork = await this.prisma.artwork.create({
      data: {
        title,
        slug: `${slugBase}-${idSuffix}`,
        description: product.description ? String(product.description) : null,
        imageUrl: image?.src ? String(image.src).slice(0, 2048) : null,
        status: "DRAFT",
        featured: false,
        printifyProductId: productId,
        variants: { create: variants },
      },
      include: { variants: true },
    });

    return {
      imported: true,
      alreadyImported: false,
      artwork,
      message: "Imported as a draft. Review mockups, variant availability, and suggested retail prices before publishing.",
    };
  }
}
