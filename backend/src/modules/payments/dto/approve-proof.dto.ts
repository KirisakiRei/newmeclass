import { IsIn, IsOptional, IsString } from 'class-validator';

export class ApproveProofDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
