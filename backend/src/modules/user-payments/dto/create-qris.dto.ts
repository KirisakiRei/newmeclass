import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateQrisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10000)
  amount?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  replacePending?: boolean;
}
