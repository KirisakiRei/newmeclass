import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminRoleDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  permissionKeys!: string[];
}
