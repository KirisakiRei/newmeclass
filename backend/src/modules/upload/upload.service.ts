import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';

type SaveImageOptions = {
  folder?: string;
  prefix?: string;
  category?: string;
  registerInMedia?: boolean;
  name?: string;
};

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureDir(folder: string) {
    const dir = resolve(process.cwd(), 'uploads', folder);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private sanitizeSegment(value: string, fallback: string) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    return normalized || fallback;
  }

  private getExtension(file: any) {
    const fromName = extname(String(file?.originalname || '')).trim();
    if (fromName) return fromName.toLowerCase();
    if (String(file?.mimetype || '').includes('png')) return '.png';
    if (String(file?.mimetype || '').includes('webp')) return '.webp';
    if (String(file?.mimetype || '').includes('gif')) return '.gif';
    return '.jpg';
  }

  async saveImage(file: any, options: SaveImageOptions = {}) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File gambar tidak ditemukan');
    }

    const folder = this.sanitizeSegment(options.folder || 'content', 'content');
    const prefix = this.sanitizeSegment(options.prefix || 'image', 'image');
    const fileName = `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}${this.getExtension(file)}`;
    const dir = this.ensureDir(folder);
    writeFileSync(resolve(dir, fileName), file.buffer);

    const url = `/uploads/${folder}/${fileName}`;
    let asset: Record<string, any> | null = null;

    if (options.registerInMedia !== false) {
      const created = await this.prisma.mediaAsset.create({
        data: {
          category: this.sanitizeSegment(options.category || 'general', 'general'),
          name: options.name || file.originalname || fileName,
          url,
        },
      });

      asset = {
        id: created.id,
        _id: created.id,
        category: created.category,
        name: created.name,
        url: created.url,
        createdAt: created.createdAt,
      };
    }

    return {
      url,
      asset,
      fileName,
    };
  }
}
