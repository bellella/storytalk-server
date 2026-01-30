import { Module } from '@nestjs/common';
import { StoryController, EpisodeController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  controllers: [StoryController, EpisodeController],
  providers: [StoryService],
})
export class StoryModule {}
