import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { requireAdminToken } from "./admin-auth";

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  private publicArtworkInclude(): Prisma.ArtworkInclude {
    return {
      artist: { select: { id: true, name: true, slug: true, bio: true, imageUrl: true } },
      variants: { where: { active: true }, orderBy: { priceCents: "asc" as const } },
    };
  }

  @Get("artworks/featured")
  async featured() {
    return this.prisma.artwork.findMany({
      where: { status: "PUBLISHED", featured: true },
      include: this.publicArtworkInclude(),
      orderBy: { updatedAt: "desc" },
    });
  }

  @Get("artworks")
  async list(
    @Query("artist") artist?: string,
    @Query("featured") featured?: string,
    @Query("q") search?: string,
    @Query("limit") limitValue?: string,
  ) {
    const where: any = { status: "PUBLISHED" };
    if (artist?.trim()) where.artist = { is: { slug: artist.trim() } };
    if (featured === "true") where.featured = true;
    if (featured === "false") where.featured = false;
    if (search?.trim()) {
      const term = search.trim().slice(0, 100);
      where.OR = [{ title: { contains: term } }, { description: { contains: term } }];
    }
    const limit = Number(limitValue);
    const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : undefined;
    return this.prisma.artwork.findMany({
      where,
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      ...(take ? { take } : {}),
    });
  }

  @Get("artists/:slug/artworks")
  async byArtist(@Param("slug") slug: string) {
    const artist = await this.prisma.artist.findUnique({ where: { slug } });
    if (!artist) throw new NotFoundException("Artist not found");
    return this.prisma.artwork.findMany({
      where: { artistId: artist.id, status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  }

  @Get("artworks/:slug")
  async bySlug(@Param("slug") slug: string) {
    const artwork = await this.prisma.artwork.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
    });
    if (!artwork) throw new NotFoundException("Artwork not found");
    return artwork;
  }

  @Get("admin/artworks")
  async listAdmin(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization);
    return this.prisma.artwork.findMany({
      include: { variants: { orderBy: { priceCents: "asc" } }, artist: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  @Post("admin/artworks")
  async create(@Headers("authorization") authorization: string, @Body() body: any) {
    requireAdminToken(authorization);
    const title = String(body.title ?? "").trim();
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException("A title and URL-safe slug are required");
    }
    const priceCents = Number(body.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < 1) {
      throw new BadRequestException("priceCents must be a positive integer in cents");
    }
    if (body.artistId) {
      const artist = await this.prisma.artist.findUnique({ where: { id: String(body.artistId) } });
      if (!artist) throw new BadRequestException("Choose a valid artist.");
    }
    return this.prisma.artwork.create({
      data: {
        title, slug,
        description: body.description ? String(body.description) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        artistId: body.artistId ? String(body.artistId) : null,
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
      include: { variants: true, artist: true },
    });
  }

  @Patch("admin/artworks/:id")
  async update(@Headers("authorization") authorization: string, @Param("id") id: string, @Body() body: any) {
    requireAdminToken(authorization);
    const existing = await this.prisma.artwork.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Artwork not found");

    const data: any = {};
    if (body.artistId !== undefined) {
      if (body.artistId === null || body.artistId === "") data.artistId = null;
      else {
        const artist = await this.prisma.artist.findUnique({ where: { id: String(body.artistId) } });
        if (!artist) throw new BadRequestException("Choose a valid artist.");
        data.artistId = artist.id;
      }
    }
    if (typeof body.featured === "boolean") data.featured = body.featured;
    if (typeof body.published === "boolean") {
      const nextArtistId = body.artistId !== undefined ? (data.artistId ?? null) : existing.artistId;
      if (body.published && existing.printifyProductId && !nextArtistId) {
        throw new BadRequestException("Assign this Printify item to an artist before publishing.");
      }
      data.status = body.published ? "PUBLISHED" : "DRAFT";
    }
    if (body.title !== undefined) {
      const title = String(body.title).trim().slice(0, 160);
      if (!title) throw new BadRequestException("Artwork title cannot be empty.");
      data.title = title;
    }
    if (body.slug !== undefined) {
      const slug = String(body.slug).trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new BadRequestException("A URL-safe slug is required.");
      data.slug = slug;
    }
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).slice(0, 2048) : null;
    return this.prisma.artwork.update({ where: { id }, data, include: { variants: true, artist: true } });
  }

  @Post("admin/artworks/:id/publish")
  async publish(@Headers("authorization") authorization: string, @Param("id") id: string, @Body() body: any) {
    requireAdminToken(authorization);
    const existing = await this.prisma.artwork.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Artwork not found");
    const published = body.published === true;
    if (published && existing.printifyProductId && !existing.artistId) {
      throw new BadRequestException("Assign this Printify item to an artist before publishing.");
    }
    return this.prisma.artwork.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT" }, include: { artist: true } });
  }
}
