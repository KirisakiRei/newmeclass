import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMitraInviteDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
