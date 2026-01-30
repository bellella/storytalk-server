import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  controllers: [StoryController],
  exports: [StoryService],
  providers: [StoryService],
})
export class StoryModule {}
