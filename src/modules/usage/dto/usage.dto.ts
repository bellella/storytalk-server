import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdRewardType, UsageFeatureType } from '@/generated/prisma/client';

export class UsageStatusDto {
  @ApiProperty({ enum: UsageFeatureType, enumName: 'UsageFeatureType' })
  featureType: UsageFeatureType;

  @ApiProperty()
  usedCount: number;

  @ApiProperty()
  freeLimit: number;

  @ApiProperty()
  adRewardedCount: number;

  @ApiProperty({ description: '오늘 남은 사용 횟수' })
  remainingCount: number;

  @ApiProperty()
  canUse: boolean;
}

export class AdRewardRequestDto {
  @ApiProperty({ enum: AdRewardType, enumName: 'AdRewardType' })
  @IsEnum(AdRewardType)
  featureType: AdRewardType;

  @ApiPropertyOptional({ description: '광고 SDK 중복 방지 키' })
  @IsOptional()
  @IsString()
  rewardKey?: string;
}

export class AdRewardResponseDto {
  @ApiProperty({ enum: AdRewardType, enumName: 'AdRewardType' })
  featureType: AdRewardType;

  @ApiProperty({ description: '지급된 추가 사용량' })
  rewardAmount: number;

  @ApiProperty({ description: '지급 후 남은 사용 횟수' })
  remainingCount: number;
}
