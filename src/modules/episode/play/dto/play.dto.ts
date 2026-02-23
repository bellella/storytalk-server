// src/modules/play/dto/play.dto.ts
import {
  EpisodeStage,
  PlayEpisodeMode,
  PlayEpisodeStatus,
  SlotDialogueType,
  SlotMessageType,
} from '@/generated/prisma/enums';
import { EpisodeDetailDto } from '@/modules/story/dto/episode-detail.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * ---------- Requests ----------
 */

// GET /play-episodes/me?status=in_progress|completed
export class GetMyPlayEpisodesQueryDto {
  @IsOptional()
  @IsEnum(['in_progress', 'completed'] as const)
  status?: 'in_progress' | 'completed';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

// POST /episodes/:episodeId/play
export class StartPlayEpisodeParamsDto {
  @IsInt()
  @Min(1)
  episodeId: number;
}

export class AiInputSlotDto {
  @IsInt()
  @Min(1)
  dialogueId: number;

  @IsString()
  @MaxLength(500) // 너 정책에 맞게
  text: string;
}

export class AiSlotDto {
  @IsInt()
  @Min(1)
  dialogueId: number;
}

/**
 * ---------- Responses ----------
 * ApiProperty 안 씀(너 설정으로 자동)
 */

export class EpisodeMetaDto {
  id: number;
  title: string;
  koreanTitle?: string | null;
  description?: string | null;
  koreanDescription?: string | null;
  thumbnailUrl?: string | null;
}

export class PlayLinksDto {
  play: string;
  replay: string;
  result: string;
  quiz?: string | null;
}

export class MyPlayEpisodeItemDto {
  playEpisodeId: number;
  episode: EpisodeDto;
  @ApiProperty({ enum: Object.values(PlayEpisodeMode) })
  mode: PlayEpisodeMode;
  @ApiProperty({ enum: Object.values(PlayEpisodeStatus) })
  status: PlayEpisodeStatus;
  @ApiProperty({ enum: Object.values(EpisodeStage) })
  currentStage: EpisodeStage;
  startedAt: string;
  completedAt?: string | null;
  lastSceneId?: number | null;
  lastSlotId?: number | null;
  resultSummary?: any | null;
}

export class EpisodeDto {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  koreanTitle?: string | null;
}

export class StartPlayEpisodeResponseDto {
  playEpisodeId: number;
  mode: PlayEpisodeMode;
  currentStage: EpisodeStage;
  startedAt: string;
  links: { play: string };
}

export class PlayEpisodeDetailResponseDto {
  play: PlayEpisodeDetailDto;
  episode: EpisodeDetailDto;
}

export class PlayEpisodeDetailDto {
  id: number;
  episodeId: number;
  mode: PlayEpisodeMode;
  @ApiProperty({ enum: Object.values(PlayEpisodeStatus) })
  status: PlayEpisodeStatus;
  startedAt: string;
  completedAt?: string | null;
  lastSceneId?: number | null;
  lastSlotId?: number | null;
  currentStage: EpisodeStage;
}

export class SlotDialogueDto {
  id: number;
  type: SlotDialogueType;
  messageType: SlotMessageType;
  order: number;
  characterId: number | null;
  characterName: string | null;
  englishText: string | null;
  koreanText: string | null;
  charImageLabel?: string | null;
  imageUrl?: string | null;
  data?: any | null;
  createdAt: string;
}

export class AiInputSlotResponseDto {
  dialogueId: number;
  savedDialogues: SlotDialogueDto[];
}

export class AiSlotResponseDto {
  savedDialogues: SlotDialogueDto[];
}

export class CompletePlayResponseDto {
  playEpisodeId: number;
  currentStage: EpisodeStage;
  status: PlayEpisodeStatus;
}

export class PlayEpisodeDto {
  id: number;
  episodeId: number;
  isCompleted: boolean;
  mode: PlayEpisodeMode;
  status: PlayEpisodeStatus;
  startedAt: string;
  completedAt?: string | null;
}

export class ReplayResponseDto {
  episode: EpisodeDetailDto;
  //segments: SegmentDto[];
}

export class ResultResponseDto {
  playEpisodeId: number;
  episode: EpisodeMetaDto;
  currentStage: EpisodeStage;
  @ApiProperty({ enum: Object.values(PlayEpisodeStatus) })
  status: PlayEpisodeStatus;
  result: any | null;
  correctedDialogues: {
    type: 'correction' | 'translation';
    userInput: string;
    englishText: string;
    koreanText: string;
    evaluation: ResultEvaluationDto;
  }[];
}

export class ResultEvaluationDto {
  overallScore: number;
  grammarScore: number;
  fluencyScore: number;
  naturalnessScore: number;
  cefr: string;
  summary: string;
  feedback: string;
}
