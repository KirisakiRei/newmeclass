import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMitraYayasanPriceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  referralPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mitraShare?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yayasanShare?: number;
}
