import { ApiProperty } from '@nestjs/swagger';

export class StickerDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: '스티커 코드 (메시지 전송 시 사용)' })
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  imageUrl: string;
}
