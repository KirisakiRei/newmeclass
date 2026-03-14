import { IsOptional, IsString, IsIn } from 'class-validator';

export class ProcessWithdrawalDto {
  @IsOptional()
  @IsIn(['APPROVED', 'REJECTED', 'PENDING'])
  status?: 'APPROVED' | 'REJECTED' | 'PENDING';

  @IsOptional()
  @IsString()
  notes?: string;
}
