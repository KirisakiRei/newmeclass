import { IsString, MinLength } from 'class-validator';

export class UpdateAdminPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
