import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { XpModule } from '../xp/xp.module';
@Module({
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
  imports: [XpModule],
})
export class QuizModule {}
