import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthAudience, Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { UploadService } from './upload.service';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const imageUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(String(file.mimetype || '').toLowerCase())) {
      callback(new BadRequestException('Format file harus JPG, PNG, GIF, atau WEBP'), false);
      return;
    }
    callback(null, true);
  },
});

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission([
    'settings.manage',
    'website_content.edit',
    'website_content.manage',
    'hero_slides.create',
    'hero_slides.edit',
    'hero_slides.manage',
    'homepage_products.create',
    'homepage_products.edit',
    'homepage_products.manage',
    'shop_products.create',
    'shop_products.edit',
    'shop_products.manage',
    'testimonials.create',
    'testimonials.edit',
    'testimonials.manage',
    'activities.create',
    'activities.edit',
    'activities.manage',
    'banners.create',
    'banners.edit',
    'banners.manage',
    'articles.create',
    'articles.edit',
    'articles.manage',
    'media.create',
    'media.manage',
    'team_management.create',
    'team_management.edit',
  ])
  @UseInterceptors(imageUploadInterceptor)
  async uploadImage(@UploadedFile() file: any, @Body() body: Record<string, any>) {
    return this.uploadService.saveImage(file, {
      folder: body?.folder || 'content',
      prefix: body?.prefix || 'image',
      category: body?.category || 'general',
      registerInMedia: String(body?.registerInMedia || 'true').toLowerCase() !== 'false',
      name: body?.name || file?.originalname,
    });
  }
}
