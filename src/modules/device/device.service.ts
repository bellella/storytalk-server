import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    userId: number,
    dto: RegisterDeviceDto
  ): Promise<SuccessResponseDto> {
    await this.prisma.userDevice.upsert({
      where: {
        userId_installationId: {
          userId,
          installationId: dto.installationId,
        },
      },
      create: {
        userId,
        installationId: dto.installationId,
        platform: dto.platform,
        expoPushToken: dto.expoPushToken ?? null,
        pushEnabled: true,
      },
      update: {
        platform: dto.platform,
        ...(dto.expoPushToken !== undefined
          ? { expoPushToken: dto.expoPushToken }
          : {}),
      },
    });
    return { success: true };
  }

  async setPushEnabled(
    userId: number,
    installationId: string,
    pushEnabled: boolean
  ): Promise<SuccessResponseDto> {
    const existing = await this.prisma.userDevice.findUnique({
      where: {
        userId_installationId: { userId, installationId },
      },
    });
    if (!existing) {
      throw new NotFoundException('등록된 기기를 찾을 수 없습니다.');
    }
    await this.prisma.userDevice.update({
      where: {
        userId_installationId: { userId, installationId },
      },
      data: { pushEnabled },
    });
    return { success: true };
  }
}
