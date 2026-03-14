import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewPriceChangeRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
