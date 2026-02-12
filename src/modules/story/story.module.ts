import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  imports: [QuizModule],
  controllers: [StoryController],
  exports: [StoryService],
  providers: [StoryService],
})
export class StoryModule {}
