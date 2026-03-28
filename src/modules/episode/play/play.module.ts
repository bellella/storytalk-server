import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { PlayService } from './play.service';
import { PlayController } from './play.controller';
import { QuizModule } from '@/modules/quiz/quiz.module';
import { StoryModule } from '@/modules/story/story.module';
import { CharacterModule } from '@/modules/character/character.module';
import { PromptTemplateModule } from '@/modules/prompt-template/prompt-template.module';
import { RewardModule } from '@/modules/reward/reward.module';

@Module({
  imports: [
    AiModule,
    QuizModule,
    StoryModule,
    CharacterModule,
    PromptTemplateModule,
    RewardModule,
  ],
  controllers: [PlayController],
  providers: [PlayService],
})
export class PlayModule {}
