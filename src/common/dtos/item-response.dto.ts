import { ApiProperty } from '@nestjs/swagger';

export class ItemResponseDto<T> {
  /**
   * List of items for the current page.
   */
  @ApiProperty({ isArray: true })
  items: T[];

  /**
   * Total count
   */
  @ApiProperty({ type: Number, nullable: true })
  totalCount: number;

}
