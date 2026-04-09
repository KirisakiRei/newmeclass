import { IsString } from 'class-validator';

export class RegisterResendOtpDto {
  @IsString()
  registrationToken!: string;
}
