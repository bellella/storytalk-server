import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class StartFaceTalkResponseDto {
  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  chatId: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startedAt: Date;
}

export class FaceTalkSessionDto {
  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  chatId: number;

  @ApiProperty()
  characterId: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  connectedAt?: Date | null;

  @ApiPropertyOptional()
  endedAt?: Date | null;

  @ApiPropertyOptional()
  durationSeconds?: number | null;

  @ApiProperty()
  totalTurns: number;
}

export class StartFaceTalkDto {
  @ApiProperty()
  @IsInt()
  chatId: number;
}

export class FaceTalkTurnDto {
  @ApiProperty()
  @IsString()
  userInput: string;
}

export class FaceTalkTurnResponseDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  translated: string;
}
