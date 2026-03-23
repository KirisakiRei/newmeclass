import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ClaimMitraInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be a valid date in YYYY-MM-DD format' })
  birthDate?: string;
}
