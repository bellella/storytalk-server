import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class PatchPushSettingDto {
  @ApiProperty({ description: 'RegisterDevice와 동일한 installationId' })
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @ApiProperty({ description: '푸시 알림 수신 여부' })
  @IsBoolean()
  pushEnabled: boolean;
}
