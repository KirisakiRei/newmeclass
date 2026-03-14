import { IsIn } from 'class-validator';

export class UserStatusQueryDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING_VERIFICATION'])
  status!: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';
}
