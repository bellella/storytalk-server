import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppleLoginDto {
  @ApiProperty({ description: 'Apple Identity Token' })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiPropertyOptional({ description: 'User name (only provided on first login)' })
  @IsString()
  @IsOptional()
  name?: string;
}
