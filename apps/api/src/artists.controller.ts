import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { requireAdminToken } from "./admin-auth";

@Controller()
export class ArtistsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("artists")
  async listPublic() {
    return this.prisma.artist.findMany({
      where: { artworks: { some: { status: "PUBLISHED" } } },
      select: {
        id: true, name: true, slug: true, bio: true, imageUrl: true,
        _count: { select: { artworks: { where: { status: "PUBLISHED" } } } },
      },
      orderBy: { name: "asc" },
    });
  }

  @Get("artists/:slug")
  async bySlug(@Param("slug") slug: string) {
    const artist = await this.prisma.artist.findFirst({
      where: { slug, artworks: { some: { status: "PUBLISHED" } } },
      select: {
        id: true, name: true, slug: true, bio: true, imageUrl: true,
        _count: { select: { artworks: { where: { status: "PUBLISHED" } } } },
      },
    });
    if (!artist) throw new NotFoundException("Artist not found");
    return artist;
  }

  @Get("admin/artists")
  async listAdmin(@Headers("authorization") authorization: string) {
    requireAdminToken(authorization);
    return this.prisma.artist.findMany({
      include: { _count: { select: { artworks: true } } },
      orderBy: { name: "asc" },
    });
  }

  @Post("admin/artists")
  async create(@Headers("authorization") authorization: string, @Body() body: any) {
    requireAdminToken(authorization);
    const name = String(body.name ?? "").trim().slice(0, 120);
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException("Artist name and URL-safe slug are required.");
    }
    return this.prisma.artist.create({
      data: {
        name,
        slug,
        bio: body.bio ? String(body.bio).trim() : null,
        imageUrl: body.imageUrl ? String(body.imageUrl).trim().slice(0, 2048) : null,
      },
    });
  }
}
