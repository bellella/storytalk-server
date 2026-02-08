import { Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';
import { StoryModule } from '../story/story.module';

@Module({
  controllers: [EpisodeController],
  imports: [StoryModule],
  providers: [EpisodeService],
  exports: [EpisodeService],
})
export class EpisodeModule {}
