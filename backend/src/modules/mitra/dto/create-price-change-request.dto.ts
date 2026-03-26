import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreatePriceChangeRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedYayasanShare!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Alasan ubah harga minimal 10 karakter.' })
  reason!: string;
}
