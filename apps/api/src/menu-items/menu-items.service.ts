import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            restaurant: {
              select: {
                id: true,
                slug: true,
                name: true,
                watermark: true,
                primaryColor: true,
              },
            },
          },
        },
        asset: true,
        modifiers: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!item || !item.available) {
      throw new NotFoundException(`Item "${id}" não encontrado`);
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      basePrice: Number(item.basePrice),
      imageUrl: item.imageUrl,
      has3d: Boolean(item.asset),
      restaurant: item.category.restaurant,
      category: { id: item.category.id, name: item.category.name },
      asset: item.asset
        ? {
            glbUrl: item.asset.glbUrl,
            usdzUrl: item.asset.usdzUrl,
            scaleFactor: item.asset.scaleFactor,
            lightingPreset: item.asset.lightingPreset,
          }
        : null,
      modifiers: item.modifiers.map((group) => ({
        id: group.id,
        name: group.name,
        required: group.required,
        multiSelect: group.multiSelect,
        options: group.options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          priceDelta: Number(opt.priceDelta),
          meshNodeName: opt.meshNodeName,
          action: opt.action,
          defaultOn: opt.defaultOn,
        })),
      })),
    };
  }
}
