import { ApiProperty } from '@nestjs/swagger';
import { StoryListItemDto } from './story-list-item.dto';

export class StoriesResponseDto {
  @ApiProperty({ type: () => StoryListItemDto, isArray: true })
  items: StoryListItemDto[];
}
