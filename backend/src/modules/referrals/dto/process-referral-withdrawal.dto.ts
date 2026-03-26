import { IsOptional, IsString } from 'class-validator';

export class ProcessReferralWithdrawalDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  providerMode?: string;
}
