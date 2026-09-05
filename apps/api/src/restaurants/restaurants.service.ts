import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        watermark: true,
        primaryColor: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante "${slug}" não encontrado`);
    }

    return restaurant;
  }

  async getMenu(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        primaryColor: true,
        categories: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            items: {
              where: { available: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
                imageUrl: true,
                asset: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante "${slug}" não encontrado`);
    }

    return {
      ...restaurant,
      categories: restaurant.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: Number(item.basePrice),
          imageUrl: item.imageUrl,
          has3d: Boolean(item.asset),
        })),
      })),
    };
  }
}
