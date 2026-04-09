import { IsString, Length } from 'class-validator';

export class RegisterVerifyOtpDto {
  @IsString()
  registrationToken!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
