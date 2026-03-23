import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class ProcessWithdrawalDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['APPROVED', 'REJECTED', 'PENDING'])
  status?: 'APPROVED' | 'REJECTED' | 'PENDING';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['manual', 'mock', 'midtrans_iris'])
  providerMode?: 'manual' | 'mock' | 'midtrans_iris';
}
