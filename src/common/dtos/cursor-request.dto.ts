import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CursorRequestDto {
  /**
   * ID of the last item from the previous page.
   * Leave empty for the first page.
   * @example 10
   */
  @ApiProperty({ type: Number, nullable: true, required: false })
  @IsOptional()
  @Type(() => Number)
  cursor?: number;

  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @Type(() => String)
  cursorString?: string;

  /**
   * Number of items to fetch per page.
   * Default is 10.
   * @default 9
   */
  @ApiProperty({ type: Number, nullable: true, default: 9, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number = 9;
}
