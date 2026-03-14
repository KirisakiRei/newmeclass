import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ApproveYayasanDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yayasanShare!: number;
}
