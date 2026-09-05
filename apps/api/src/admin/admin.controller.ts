import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('restaurants/:slug')
  dashboard(@Param('slug') slug: string) {
    return this.adminService.dashboard(slug);
  }

  @Post('restaurants/:slug/categories')
  createCategory(
    @Param('slug') slug: string,
    @Body() body: { name: string; sortOrder?: number },
  ) {
    return this.adminService.createCategory(slug, body);
  }

  @Post('restaurants/:slug/items')
  createItem(
    @Param('slug') slug: string,
    @Body()
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
    return this.adminService.createItem(slug, body);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body()
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
    return this.adminService.updateItem(id, body);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.adminService.deleteItem(id);
  }

  @Get('guide/photogrammetry')
  photogrammetryGuide() {
    return this.adminService.photogrammetryGuide();
  }
}
