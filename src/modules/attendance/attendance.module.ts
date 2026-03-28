import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { RewardModule } from '../reward/reward.module';

@Module({
  imports: [RewardModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
