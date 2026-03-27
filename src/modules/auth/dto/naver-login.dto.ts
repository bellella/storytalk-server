import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NaverLoginDto {
  @ApiProperty({ description: 'Naver Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
