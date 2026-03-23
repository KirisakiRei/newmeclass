import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TesAAnswersDto {
  @IsBoolean()
  q1!: boolean;

  @IsBoolean()
  q2!: boolean;

  @IsBoolean()
  q3!: boolean;

  @IsBoolean()
  q4!: boolean;

  @IsBoolean()
  q5!: boolean;

  @IsBoolean()
  q6!: boolean;
}

class TesBAnswersDto {
  @IsIn(['A', 'B', 'C', 'D', 'E'])
  q1!: 'A' | 'B' | 'C' | 'D' | 'E';

  @IsIn(['A', 'B', 'C', 'D', 'E'])
  q2!: 'A' | 'B' | 'C' | 'D' | 'E';

  @IsIn(['A', 'B', 'C', 'D', 'E'])
  q3!: 'A' | 'B' | 'C' | 'D' | 'E';

  @IsIn(['A', 'B', 'C', 'D', 'E'])
  q4!: 'A' | 'B' | 'C' | 'D' | 'E';

  @IsIn(['A', 'B', 'C', 'D', 'E'])
  q5!: 'A' | 'B' | 'C' | 'D' | 'E';
}

class TesCAnswersDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsIn([10, 7, 4, 1], { each: true })
  sense_air?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsIn([10, 7, 4, 1], { each: true })
  visual_kayu?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsIn([10, 7, 4, 1], { each: true })
  auditori_api?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsIn([10, 7, 4, 1], { each: true })
  reading_logam?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsIn([10, 7, 4, 1], { each: true })
  kinestetik_tanah?: number[];
}

export class SubmitCorePersonalityTestDto {
  @ValidateNested()
  @Type(() => TesAAnswersDto)
  tes_a!: TesAAnswersDto;

  @ValidateNested()
  @Type(() => TesBAnswersDto)
  tes_b!: TesBAnswersDto;

  @ValidateNested()
  @Type(() => TesCAnswersDto)
  tes_c!: TesCAnswersDto;
}
