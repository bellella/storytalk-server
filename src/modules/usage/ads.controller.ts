import { ReqUser } from '@/common/decorators/user.decorator';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdRewardRequestDto, AdRewardResponseDto } from './dto/usage.dto';
import { UsageService } from './usage.service';

@ApiTags('Ads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly usageService: UsageService) {}

  @Post('reward')
  @ApiOkResponse({ type: AdRewardResponseDto })
  async grantAdReward(
    @ReqUser('id') userId: number,
    @Body() dto: AdRewardRequestDto
  ): Promise<AdRewardResponseDto> {
    return this.usageService.grantAdReward(userId, dto);
  }
}
