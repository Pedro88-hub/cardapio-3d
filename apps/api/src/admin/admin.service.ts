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
      title: 'Pipeline de captura 3D do prato',
      steps: [
        {
          id: 'setup',
          title: 'Setup físico (opcional)',
          body: 'Use lightbox portátil e prato giratório com luz difusa para texturas sem sombra dura.',
        },
        {
          id: 'capture',
          title: 'Fotogrametria mobile',
          body: 'Grave o prato com LiDAR (iPhone Pro) ou apps em nuvem: Polycam, Luma AI ou RealityCapture. Girar 360° em volta do prato.',
          apps: ['Polycam', 'Luma AI', 'RealityCapture', 'Object Capture (iOS)'],
        },
        {
          id: 'export',
          title: 'Exportar',
          body: 'Exporte GLB (Android/Web) e USDZ (iOS Quick Look). Alvo: até 10–15 MB, texturas baked.',
        },
        {
          id: 'upload',
          title: 'Upload no painel',
          body: 'Cole as URLs dos arquivos (ou caminhos /models/...) e ajuste scaleFactor / lightingPreset.',
        },
        {
          id: 'future',
          title: 'Visão de futuro',
          body: 'Arquitetura pronta para NeRFs / Gaussian Splatting quando forem viáveis em browsers móveis.',
        },
      ],
      constraints: [
        'Max ~10–15 MB por modelo',
        'Texturas assadas (baked)',
        'Fallback 2D obrigatório se AR falhar',
        'Iluminação HDRI neutra/warm para evitar “comida de plástico”',
      ],
    };
  }
}
