import { Module } from '@nestjs/common';
import { CharacterModule } from '../character/character.module';
import { QuizModule } from '../quiz/quiz.module';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  imports: [QuizModule, CharacterModule],
  controllers: [StoryController],
  exports: [StoryService],
  providers: [StoryService],
})
export class StoryModule {}
