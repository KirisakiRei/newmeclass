import { Type } from 'class-transformer';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreatePriceChangeRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedYayasanShare!: number;

  @IsString()
  @MinLength(10)
  reason!: string;
}
