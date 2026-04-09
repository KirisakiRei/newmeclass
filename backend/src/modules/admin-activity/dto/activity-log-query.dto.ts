import { IsIn, IsOptional, IsString } from 'class-validator';

export class ActivityLogQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['auth', 'admin_management', 'settings', 'content', 'users', 'yayasan', 'mitra', 'finance', 'approval', 'testing'])
  category?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
