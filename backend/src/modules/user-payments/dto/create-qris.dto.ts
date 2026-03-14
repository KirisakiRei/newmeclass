import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQrisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10000)
  amount?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
