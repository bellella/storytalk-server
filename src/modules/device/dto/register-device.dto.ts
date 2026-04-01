import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ description: '앱 설치 단위 고유 ID (클라이언트 생성·저장)' })
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @ApiProperty({ enum: ['ios', 'android'], description: '플랫폼' })
  @IsString()
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @ApiPropertyOptional({ description: 'Expo push token (없으면 null 유지/생략)' })
  @IsOptional()
  @IsString()
  expoPushToken?: string | null;
}
