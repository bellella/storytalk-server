import { ReqUser } from '@/common/decorators/user.decorator';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageFeatureType } from '@/generated/prisma/client';
import { UsageStatusDto } from './dto/usage.dto';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get(':featureType')
  @ApiOkResponse({ type: UsageStatusDto })
  async getUsageStatus(
    @Param('featureType') featureType: UsageFeatureType,
    @ReqUser('id') userId: number
  ): Promise<UsageStatusDto> {
    return this.usageService.getUsageStatus(userId, featureType);
  }
}
