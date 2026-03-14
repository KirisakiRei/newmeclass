import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('categories/list')
  categories() { return this.service.getCategories(); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Put('reorder')
  reorder(@Body() body: any) { return this.service.reorder(body.orders || body); }

  @Post('seed-questions')
  seed() { return this.service.seedQuestions(); }

  @Get(':id')
  getById(@Param('id') id: string) { return this.service.getById(id); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
