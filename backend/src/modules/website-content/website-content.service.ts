import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebsiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  heroSlides() { return this.prisma.heroSlide.findMany({ orderBy: { order: 'asc' } }); }
  createHeroSlide(body: any) { return this.prisma.heroSlide.create({ data: { title: body.title || '', subtitle: body.subtitle, imageUrl: body.imageUrl || body.image || '', order: body.order || 0 } }); }
  updateHeroSlide(id: string, body: any) { return this.prisma.heroSlide.update({ where: { id }, data: body }); }
  async deleteHeroSlide(id: string) { await this.prisma.heroSlide.delete({ where: { id } }); return { message: 'Deleted' }; }

  products() { return this.prisma.homepageProduct.findMany({ orderBy: { order: 'asc' } }); }
  createProduct(body: any) { return this.prisma.homepageProduct.create({ data: { name: body.name || '', description: body.description, imageUrl: body.imageUrl || '', order: body.order || 0 } }); }
  updateProduct(id: string, body: any) { return this.prisma.homepageProduct.update({ where: { id }, data: body }); }
  async deleteProduct(id: string) { await this.prisma.homepageProduct.delete({ where: { id } }); return { message: 'Deleted' }; }

  testimonials() { return this.prisma.testimonial.findMany({ orderBy: { order: 'asc' } }); }
  createTestimonial(body: any) { return this.prisma.testimonial.create({ data: { name: body.name || '', role: body.role, quote: body.quote || body.text || '', avatarUrl: body.avatarUrl, order: body.order || 0 } }); }
  updateTestimonial(id: string, body: any) { return this.prisma.testimonial.update({ where: { id }, data: body }); }
  async deleteTestimonial(id: string) { await this.prisma.testimonial.delete({ where: { id } }); return { message: 'Deleted' }; }

  activities() { return this.prisma.activity.findMany({ orderBy: { order: 'asc' } }); }
  createActivity(body: any) { return this.prisma.activity.create({ data: { title: body.title || '', description: body.description, imageUrl: body.imageUrl, order: body.order || 0 } }); }
  updateActivity(id: string, body: any) { return this.prisma.activity.update({ where: { id }, data: body }); }
  async deleteActivity(id: string) { await this.prisma.activity.delete({ where: { id } }); return { message: 'Deleted' }; }

  sections() { return this.prisma.websiteSection.findMany({ orderBy: { order: 'asc' } }); }
  sectionImages() {
    return this.prisma.mediaAsset.findMany({
      where: { category: { in: ['hero-slides', 'banners', 'products-home', 'products-shop', 'testimonials', 'activities', 'articles', 'team', 'general'] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
  async reorderSections(body: any) {
    const updates = Array.isArray(body?.sections) ? body.sections : [];
    for (const item of updates) {
      await this.prisma.websiteSection.update({ where: { id: item._id || item.id }, data: { order: Number(item.order || 0) } });
    }
    return this.sections();
  }

  updateSection(id: string, body: any) { return this.prisma.websiteSection.update({ where: { id }, data: { title: body.title, isVisible: body.isVisible, data: body } }); }

  async seedDefaults() {
    const defaults = [
      { key: 'hero', title: 'Hero', order: 1 },
      { key: 'products', title: 'Products', order: 2 },
      { key: 'testimonials', title: 'Testimonials', order: 3 },
      { key: 'activities', title: 'Activities', order: 4 },
      { key: 'banners', title: 'Banners', order: 5 },
    ];

    for (const item of defaults) {
      await this.prisma.websiteSection.upsert({ where: { key: item.key }, create: item, update: { title: item.title, order: item.order } });
    }

    return { message: 'Default sections seeded' };
  }
}
