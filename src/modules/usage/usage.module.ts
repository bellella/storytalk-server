import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  controllers: [UsageController, AdsController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
