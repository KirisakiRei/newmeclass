import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TopupDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(10000)
  amount!: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
