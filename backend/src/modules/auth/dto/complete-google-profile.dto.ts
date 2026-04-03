import { IsOptional, IsString, Matches } from 'class-validator';

export class CompleteGoogleProfileDto {
  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  village?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be a valid date in YYYY-MM-DD format' })
  birthDate!: string;

  @IsString()
  referralSource!: string;

  @IsOptional()
  @IsString()
  referralOther?: string;
}
