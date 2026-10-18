import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { requireAdminToken } from "./admin-auth";

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("artworks")
  async list() {
    return this.prisma.artwork.findMany({
      where: { status: "PUBLISHED" },
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

  @Get("admin/artworks")
  async listAdmin(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization)
    return this.prisma.artwork.findMany({
      include: { variants: { orderBy: { priceCents: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  @Post("admin/artworks")
  async create(@Headers("authorization") authorization: string, @Body() body: any) {
    requireAdminToken(authorization)
    const title = String(body.title ?? "").trim();
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException("A title and URL-safe slug are required");
    }
    const priceCents = Number(body.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < 1) {
      throw new BadRequestException("priceCents must be a positive integer in cents");
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
  async publish(@Headers("authorization") authorization: string, @Param("id") id: string, @Body() body: any) {
    requireAdminToken(authorization)
    return this.prisma.artwork.update({ where: { id }, data: { status: body.published === true ? "PUBLISHED" : "DRAFT" } });
  }

}