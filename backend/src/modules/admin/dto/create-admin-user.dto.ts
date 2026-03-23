import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'username may only contain letters, numbers, dots, underscores, and hyphens' })
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  adminRoleId!: string;
}
