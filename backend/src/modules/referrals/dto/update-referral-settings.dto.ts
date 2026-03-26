import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateReferralSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusPerReferral?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumWithdraw?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
