import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReferralPriceDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  referralPrice!: number;
}
