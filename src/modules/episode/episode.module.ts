import { Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { StoryModule } from '../story/story.module';

@Module({
  controllers: [EpisodeController],
  imports: [StoryModule],
})
export class EpisodeModule {}
