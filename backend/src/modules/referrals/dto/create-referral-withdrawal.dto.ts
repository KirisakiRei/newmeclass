import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateReferralWithdrawalDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @MinLength(8)
  danaNumber!: string;

  @IsString()
  @MinLength(3)
  accountName!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
