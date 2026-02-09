import { Module } from '@nestjs/common';
import { EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';
import { StoryModule } from '../story/story.module';
import { XpModule } from '../xp/xp.module';

@Module({
  controllers: [EpisodeController],
  imports: [StoryModule, XpModule],
  providers: [EpisodeService],
  exports: [EpisodeService],
})
export class EpisodeModule {}
