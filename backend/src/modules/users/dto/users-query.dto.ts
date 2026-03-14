import { IsIn, IsOptional, IsString } from 'class-validator';

export class UsersQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING_VERIFICATION'])
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  isBanned?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
