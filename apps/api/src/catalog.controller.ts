import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { requireAdminToken } from "./admin-auth";

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  /** Collapse separately imported Printify products into one public artwork when they share a group key. */
  private collapseGroups<T extends { id: string; groupKey?: string | null; artistId?: string | null; featured?: boolean; variants: any[] }>(rows: T[]): T[] {
    const groups = new Map<string, T>();
    for (const row of rows) {
      const key = row.groupKey ? `${row.artistId || "no-artist"}:${row.groupKey}` : `artwork:${row.id}`;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, { ...row, variants: [...row.variants] });
        continue;
      }
      current.variants = [...current.variants, ...row.variants].filter((variant, index, all) => all.findIndex((item) => item.id === variant.id) === index);
      if (row.featured) current.featured = true;
    }
    return [...groups.values()].map((row) => ({ ...row, variants: [...row.variants].sort((a, b) => Number(a.priceCents) - Number(b.priceCents)) }));
  }

  private publicArtworkInclude(): Prisma.ArtworkInclude {
    return {
      artist: { select: { id: true, name: true, slug: true, bio: true, imageUrl: true } },
      variants: { where: { active: true }, orderBy: { priceCents: "asc" as const } },
    };
  }

  @Get("artworks/featured")
  async featured() {
    const rows = await this.prisma.artwork.findMany({
      where: { status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    });
    return this.collapseGroups(rows).filter((artwork) => artwork.featured);
  }

  @Get("artworks")
  async list(
    @Query("artist") artist?: string,
    @Query("featured") featured?: string,
    @Query("q") search?: string,
    @Query("limit") limitValue?: string,
  ) {
    const rows = await this.prisma.artwork.findMany({
      where: { status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    let artworks = this.collapseGroups(rows);
    if (artist?.trim()) artworks = artworks.filter((artwork: any) => artwork.artist?.slug === artist.trim());
    if (featured === "true") artworks = artworks.filter((artwork) => artwork.featured);
    if (featured === "false") artworks = artworks.filter((artwork) => !artwork.featured);
    if (search?.trim()) {
      const term = search.trim().slice(0, 100).toLocaleLowerCase();
      artworks = artworks.filter((artwork: any) => `${artwork.title} ${artwork.description || ""}`.toLocaleLowerCase().includes(term));
    }
    const limit = Number(limitValue);
    const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : undefined;
    return take ? artworks.slice(0, take) : artworks;
  }

  @Get("artists/:slug/artworks")
  async byArtist(@Param("slug") slug: string) {
    const artist = await this.prisma.artist.findUnique({ where: { slug } });
    if (!artist) throw new NotFoundException("Artist not found");
    const rows = await this.prisma.artwork.findMany({
      where: { artistId: artist.id, status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    return this.collapseGroups(rows);
  }

  @Get("artworks/:slug")
  async bySlug(@Param("slug") slug: string) {
    const artwork = await this.prisma.artwork.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
    });
    if (!artwork) throw new NotFoundException("Artwork not found");
    if (!artwork.groupKey) return artwork;
    const rows = await this.prisma.artwork.findMany({
      where: { groupKey: artwork.groupKey, artistId: artwork.artistId, status: "PUBLISHED" },
      include: this.publicArtworkInclude(),
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    });
    return this.collapseGroups(rows)[0] || artwork;
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
    if (body.groupKey !== undefined) {
      const rawGroupKey = String(body.groupKey ?? "").trim().toLowerCase();
      if (!rawGroupKey) data.groupKey = null;
      else {
        const groupKey = rawGroupKey.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 191);
        if (!groupKey) throw new BadRequestException("Enter a valid group name using letters or numbers.");
        data.groupKey = groupKey;
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
