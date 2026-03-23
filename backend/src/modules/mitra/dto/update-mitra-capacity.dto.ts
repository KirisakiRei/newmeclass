import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMitraCapacityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityLimit!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
