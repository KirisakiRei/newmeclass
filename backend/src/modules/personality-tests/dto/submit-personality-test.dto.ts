import { IsArray, ValidateNested, IsString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  selectedOption!: number;
}

export class SubmitPersonalityTestDto {
  @IsString()
  testType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  includePremium?: boolean;
}
