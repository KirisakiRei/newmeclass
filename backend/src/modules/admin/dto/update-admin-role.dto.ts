import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAdminRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissionKeys?: string[];
}
