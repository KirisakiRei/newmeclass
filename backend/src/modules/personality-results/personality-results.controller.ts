import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PersonalityResultsService } from './personality-results.service';

@Controller('personality-results')
export class PersonalityResultsController {
  constructor(private readonly service: PersonalityResultsService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':code')
  getByCode(@Param('code') code: string) { return this.service.getByCode(code); }

  @Put(':code')
  update(@Param('code') code: string, @Body() body: any) { return this.service.update(code, body); }
}
