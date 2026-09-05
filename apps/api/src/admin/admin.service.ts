import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: { asset: true },
            },
          },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');

    return {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      watermark: restaurant.watermark,
      primaryColor: restaurant.primaryColor,
      categories: restaurant.categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: Number(item.basePrice),
          imageUrl: item.imageUrl,
          available: item.available,
          has3d: Boolean(item.asset),
          asset: item.asset
            ? {
                glbUrl: item.asset.glbUrl,
                usdzUrl: item.asset.usdzUrl,
                scaleFactor: item.asset.scaleFactor,
                lightingPreset: item.asset.lightingPreset,
              }
            : null,
        })),
      })),
    };
  }

  async createCategory(slug: string, body: { name: string; sortOrder?: number }) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { slug } });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    return this.prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async createItem(
    slug: string,
    body: {
      categoryId: string;
      name: string;
      description?: string;
      basePrice: number;
      imageUrl?: string;
      glbUrl?: string;
      usdzUrl?: string;
      scaleFactor?: number;
      lightingPreset?: string;
      nutritionTags?: {
        id: string;
        label: string;
        position: string;
        normal: string;
      }[];
    },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { slug } });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');

    const category = await this.prisma.category.findFirst({
      where: { id: body.categoryId, restaurantId: restaurant.id },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');

    return this.prisma.menuItem.create({
      data: {
        categoryId: body.categoryId,
        name: body.name,
        description: body.description,
        basePrice: body.basePrice,
        imageUrl: body.imageUrl,
        nutritionTags: body.nutritionTags ?? undefined,
        asset: body.glbUrl
          ? {
              create: {
                glbUrl: body.glbUrl,
                usdzUrl: body.usdzUrl,
                scaleFactor: body.scaleFactor ?? 1,
                lightingPreset: body.lightingPreset ?? 'neutral',
              },
            }
          : undefined,
      },
      include: { asset: true },
    });
  }

  async updateItem(
    id: string,
    body: {
      name?: string;
      description?: string;
      basePrice?: number;
      imageUrl?: string | null;
      available?: boolean;
      glbUrl?: string;
      usdzUrl?: string | null;
      scaleFactor?: number;
      lightingPreset?: string;
      nutritionTags?: {
        id: string;
        label: string;
        position: string;
        normal: string;
      }[];
    },
  ) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const data: Prisma.MenuItemUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.basePrice !== undefined) data.basePrice = body.basePrice;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.available !== undefined) data.available = body.available;
    if (body.nutritionTags !== undefined) data.nutritionTags = body.nutritionTags;

    await this.prisma.menuItem.update({ where: { id }, data });

    if (body.glbUrl || body.usdzUrl !== undefined || body.scaleFactor || body.lightingPreset) {
      if (item.asset) {
        await this.prisma.menuItemAsset.update({
          where: { menuItemId: id },
          data: {
            glbUrl: body.glbUrl ?? item.asset.glbUrl,
            usdzUrl:
              body.usdzUrl !== undefined ? body.usdzUrl : item.asset.usdzUrl,
            scaleFactor: body.scaleFactor ?? item.asset.scaleFactor,
            lightingPreset: body.lightingPreset ?? item.asset.lightingPreset,
          },
        });
      } else if (body.glbUrl) {
        await this.prisma.menuItemAsset.create({
          data: {
            menuItemId: id,
            glbUrl: body.glbUrl,
            usdzUrl: body.usdzUrl,
            scaleFactor: body.scaleFactor ?? 1,
            lightingPreset: body.lightingPreset ?? 'neutral',
          },
        });
      }
    }

    return this.prisma.menuItem.findUnique({
      where: { id },
      include: { asset: true },
    });
  }

  async deleteItem(id: string) {
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  photogrammetryGuide() {
    return {
      title: 'Como gerar o 3D do prato',
      steps: [
        {
          id: 'setup',
          title: 'Deixe a luz boa',
          body: 'Se puder, use uma caixinha de luz ou um lugar claro sem sombra forte. Um prato giratório ajuda, mas não é obrigatório.',
        },
        {
          id: 'capture',
          title: 'Escaneie com o celular',
          body: 'Abra o Polycam, Luma AI ou a câmera 3D do iPhone Pro e rode em volta do prato (~360°). Em 1–2 minutos o app monta o modelo.',
          apps: ['Polycam', 'Luma AI', 'Object Capture (iPhone)'],
        },
        {
          id: 'export',
          title: 'Exporte dois arquivos',
          body: 'No app, exporte GLB (Android/site) e USDZ (iPhone). Se pedir “otimizar”, aceite — o arquivo fica mais leve.',
        },
        {
          id: 'upload',
          title: 'Envie neste painel',
          body: 'Na etapa “Modelo 3D”, toque em escolher arquivo e mande o .glb e o .usdz. Pronto — sem colar links.',
        },
        {
          id: 'future',
          title: 'Depois',
          body: 'No futuro o sistema poderá aceitar scans ainda mais realistas (NeRF / Gaussian Splatting). Por enquanto GLB + USDZ bastam.',
        },
      ],
      constraints: [
        'Prefira modelos até cerca de 15 MB',
        'Sempre cadastre também uma foto 2D',
        'Se o AR falhar, o cliente ainda pede pela foto',
      ],
    };
  }
}
