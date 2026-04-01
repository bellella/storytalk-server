import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PatchPushSettingDto } from './dto/push-setting.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('register')
  @ApiOkResponse({ type: SuccessResponseDto })
  register(
    @ReqUser('id') userId: number,
    @Body() dto: RegisterDeviceDto
  ): Promise<SuccessResponseDto> {
    return this.deviceService.register(userId, dto);
  }

  @Patch('push-setting')
  @ApiOkResponse({ type: SuccessResponseDto })
  patchPushSetting(
    @ReqUser('id') userId: number,
    @Body() dto: PatchPushSettingDto
  ): Promise<SuccessResponseDto> {
    return this.deviceService.setPushEnabled(
      userId,
      dto.installationId,
      dto.pushEnabled
    );
  }
}
