import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WebsiteContentService } from './website-content.service';

@Controller('website-content')
export class WebsiteContentController {
  constructor(private readonly service: WebsiteContentService) {}

  @Get('hero-slides') getHeroSlides() { return this.service.heroSlides(); }
  @Post('hero-slides') createHeroSlide(@Body() body: any) { return this.service.createHeroSlide(body); }
  @Put('hero-slides/:id') updateHeroSlide(@Param('id') id: string, @Body() body: any) { return this.service.updateHeroSlide(id, body); }
  @Delete('hero-slides/:id') deleteHeroSlide(@Param('id') id: string) { return this.service.deleteHeroSlide(id); }

  @Get('products') getProducts() { return this.service.products(); }
  @Post('products') createProduct(@Body() body: any) { return this.service.createProduct(body); }
  @Put('products/:id') updateProduct(@Param('id') id: string, @Body() body: any) { return this.service.updateProduct(id, body); }
  @Delete('products/:id') deleteProduct(@Param('id') id: string) { return this.service.deleteProduct(id); }

  @Get('testimonials') getTestimonials() { return this.service.testimonials(); }
  @Post('testimonials') createTestimonial(@Body() body: any) { return this.service.createTestimonial(body); }
  @Put('testimonials/:id') updateTestimonial(@Param('id') id: string, @Body() body: any) { return this.service.updateTestimonial(id, body); }
  @Delete('testimonials/:id') deleteTestimonial(@Param('id') id: string) { return this.service.deleteTestimonial(id); }

  @Get('activities') getActivities() { return this.service.activities(); }
  @Post('activities') createActivity(@Body() body: any) { return this.service.createActivity(body); }
  @Put('activities/:id') updateActivity(@Param('id') id: string, @Body() body: any) { return this.service.updateActivity(id, body); }
  @Delete('activities/:id') deleteActivity(@Param('id') id: string) { return this.service.deleteActivity(id); }

  @Get('sections') getSections() { return this.service.sections(); }
  @Get('section-images') getSectionImages() { return this.service.sectionImages(); }
  @Put('sections/reorder') reorderSections(@Body() body: any) { return this.service.reorderSections(body); }
  @Put('sections/:id') updateSection(@Param('id') id: string, @Body() body: any) { return this.service.updateSection(id, body); }
  @Post('seed-defaults') seedDefaults() { return this.service.seedDefaults(); }
}
