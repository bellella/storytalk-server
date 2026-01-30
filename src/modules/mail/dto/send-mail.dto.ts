import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendMailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string; // Recipient email address

  @IsString()
  @IsNotEmpty()
  subject: string; // Email subject

  @IsString()
  @IsNotEmpty()
  content: string; // Email content
}
