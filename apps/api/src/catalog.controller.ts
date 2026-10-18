import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("artworks")
  async list(@Query("all") all?: string) {
    const where = all === "true"
      ? {}
      : { status: "PUBLISHED" as const };
    return this.prisma.artwork.findMany({
      where,
      include: { variants: { where: { active: true }, orderBy: { priceCents: "asc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  }

  @Get("artworks/:slug")
  async bySlug(@Param("slug") slug: string) {
    const artwork = await this.prisma.artwork.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { variants: { where: { active: true }, orderBy: { priceCents: "asc" } } },
    });
    if (!artwork) throw new NotFoundException("Artwork not found");
    return artwork;
  }

  @Post("admin/artworks")
  async create(@Headers("x-admin-key") key: string, @Body() body: any) {
    this.requireAdmin(key);
    const title = String(body.title ?? "").trim();
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException("A title and URL-safe slug are required");
    }
    const priceCents = Number(body.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < 1) {
      throw new BadRequestException("priceCents must be a positive integer");
    }
    return this.prisma.artwork.create({
      data: {
        title, slug,
        description: body.description ? String(body.description) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        status: body.published === true ? "PUBLISHED" : "DRAFT",
        featured: body.featured === true,
        variants: { create: [{
          name: String(body.variantName || "Art print"),
          priceCents,
          sku: body.sku ? String(body.sku) : undefined,
          widthInches: body.widthInches ? Number(body.widthInches) : undefined,
          heightInches: body.heightInches ? Number(body.heightInches) : undefined,
          active: true,
        }] },
      },
      include: { variants: true },
    });
  }

  @Post("admin/artworks/:id/publish")
  async publish(@Headers("x-admin-key") key: string, @Param("id") id: string, @Body() body: any) {
    this.requireAdmin(key);
    const status = body.published === true ? "PUBLISHED" : "DRAFT";
    return this.prisma.artwork.update({ where: { id }, data: { status } });
  }

  private requireAdmin(key?: string) {
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException("Admin API key is missing or invalid");
    }
  }
}
