import { IsOptional, IsString } from 'class-validator';

export class ReferralTransactionsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
