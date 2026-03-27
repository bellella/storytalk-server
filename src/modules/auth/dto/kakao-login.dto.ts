import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KakaoLoginDto {
  @ApiProperty({ description: 'Kakao Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
