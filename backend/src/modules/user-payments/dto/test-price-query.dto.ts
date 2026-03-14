import { IsOptional, IsString } from 'class-validator';

export class TestPriceQueryDto {
  @IsOptional()
  @IsString()
  referralCode?: string;
}
