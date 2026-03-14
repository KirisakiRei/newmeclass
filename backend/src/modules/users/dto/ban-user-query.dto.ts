import { IsOptional, IsString, MinLength } from 'class-validator';

export class BanUserQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
