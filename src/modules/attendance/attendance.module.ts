import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { RewardModule } from '../reward/reward.module';
import { XpModule } from '../xp/xp.module';

@Module({
  imports: [RewardModule, XpModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
