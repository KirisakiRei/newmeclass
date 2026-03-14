import { Allow, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadUserProofDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @Allow()
  file?: unknown;
}
