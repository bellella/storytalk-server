import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { RewardModule } from '../reward/reward.module';
import { XpModule } from '../xp/xp.module';
@Module({
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
  imports: [XpModule, RewardModule],
})
export class QuizModule {}
