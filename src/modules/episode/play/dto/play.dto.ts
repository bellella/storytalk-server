// src/modules/play/dto/play.dto.ts
import {
  EpisodeStage,
  PlayEpisodeMode,
  PlayEpisodeStatus,
  SlotDialogueType,
  SlotMessageType,
} from '@/generated/prisma/enums';
import {
  DialogueDto,
  EpisodeDetailDto,
  SceneDto,
} from '@/modules/story/dto/episode-detail.dto';
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
  @MaxLength(500)
  text: string;
}

export class AiSlotDto {
  @IsInt()
  @Min(1)
  dialogueId: number;
}

export class ChoiceSlotDto {
  @IsInt()
  @Min(1)
  dialogueId: number;

  @IsString()
  optionKey: string;
}

export class BranchTriggerDto {
  @IsInt()
  @Min(1)
  sceneId: number;
}

/**
 * ---------- Responses ----------
 * ApiProperty 안 씀(너 설정으로 자동)
 */

export class PlayEpisodeMetaDto {
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
  @ApiProperty({ enum: PlayEpisodeMode, enumName: 'PlayEpisodeMode' })
  mode: PlayEpisodeMode;
  @ApiProperty({ enum: PlayEpisodeStatus, enumName: 'PlayEpisodeStatus' })
  status: PlayEpisodeStatus;
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
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
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
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
  @ApiProperty({ enum: PlayEpisodeStatus, enumName: 'PlayEpisodeStatus' })
  status: PlayEpisodeStatus;
  startedAt: string;
  completedAt?: string | null;
  lastSceneId?: number | null;
  lastSlotId?: number | null;
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
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

export class ChoiceSlotResponseDto {
  followUpDialogues: DialogueDto[];
}

export class BranchTriggerResponseDto {
  winningKey: string;
  pickedSceneIds: number[];
  scenes: SceneDto[];
}

export class RewardGrantDto {
  type: string;
  payload: any;
}

export class EvaluationTurnDto {
  index: number;
  overallScore: number | null;
  grammarScore: number | null;
  fluencyScore: number | null;
  naturalnessScore: number | null;
  cefr: string | null;
  feedback: string | null;
}

export class EvaluationAggregateDto {
  overallScore: number | null;
  grammarScore: number | null;
  fluencyScore: number | null;
  naturalnessScore: number | null;
  cefr: string | null;
  summary: string | null;
}

export class EvaluationResultDto {
  turns: EvaluationTurnDto[];
  aggregate: EvaluationAggregateDto;
  generatedAt: string;
}

/** completePlayEpisode 응답 - 프론트 표시용 */
export class EndingInfoDto {
  id: number;
  key: string;
  name: string;
  imageUrl: string | null;
  episodeId: number;
  episodeTitle: string;
  episodeKoreanTitle: string | null;
}

/** completePlayEpisode 응답 - ResultResponseDto와 동일 구조 */
export type CompletePlayResponseDto = ResultResponseDto;

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

export class ResultEvaluationDto {
  overallScore: number;
  grammarScore: number;
  fluencyScore: number;
  naturalnessScore: number;
  cefr: string;
  summary: string;
  feedback: string;
}

/** AI_INPUT_SLOT 턴별 평가 + 교정 문장 */
export class CorrectedSlotDto {
  type: 'correction' | 'translation';
  userInput: string;
  englishText: string;
  koreanText: string;
  evaluation: ResultEvaluationDto | null;
}

/** 플레이 결과 (play.result + slot 데이터 통합) - complete/getResult 공통 */
export class PlayResultDto {
  /** AI 평가 전체 (ROLEPLAY_WITH_EVAL 모드) */
  evaluation: EvaluationResultDto | null;
  /** 엔딩 도달 시 */
  ending: EndingInfoDto | null;
  /** 턴별 교정/번역 + 평가 (AI_INPUT_SLOT 슬롯들) */
  slots: CorrectedSlotDto[];
  /** 완료 시 XP 획득량 */
  xpGained: number;
  /** 지급된 리워드 (캐릭터 해금 등) */
  rewards: RewardGrantDto[];
}

export class ResultResponseDto {
  playEpisodeId: number;
  episode: PlayEpisodeMetaDto;
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
  currentStage: EpisodeStage;
  @ApiProperty({ enum: PlayEpisodeStatus, enumName: 'PlayEpisodeStatus' })
  status: PlayEpisodeStatus;
  /** 평가, 엔딩, 슬롯 평가 통합 */
  result: PlayResultDto;
}

/** 유저가 해금한 엔딩 (엔딩 리스트용) */
export class UserEndingItemDto {
  id: number;
  key: string;
  name: string;
  imageUrl: string | null;
  reachedCount: number; // 도달 횟수
  reachedAt: string;
  episode: {
    id: number;
    title: string;
    koreanTitle: string | null;
    thumbnailUrl: string | null;
    storyId: number | null;
    storyTitle: string | null;
  };
}
