import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { QuizSourceType, QuizType } from '@/generated/prisma/enums';

// ── 공통 ──
export class TokenDto {
  id: string;
  t: string;
}

// ── SENTENCE_BUILD data ──
export class SentenceBuildDataDto {
  @ApiPropertyOptional()
  promptKorean?: string;

  @ApiProperty({ type: [TokenDto] })
  tokensAll: TokenDto[];

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  tokenTextMap: Record<string, string>;

  @ApiProperty({ type: [String] })
  answerTokenIds: string[];

  punctuation: string;
}

// ── SENTENCE_CLOZE_BUILD data ──
export class TextPartDto {
  @ApiProperty({ enum: ['text'] })
  type: 'text';
  t: string;
}

export class SlotPartDto {
  @ApiProperty({ enum: ['slot'] })
  type: 'slot';
  slotId: string;
}

export class SentenceClozeDataDto {
  @ApiPropertyOptional()
  promptKorean?: string;

  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(TextPartDto) },
        { $ref: getSchemaPath(SlotPartDto) },
      ],
    },
  })
  parts: (TextPartDto | SlotPartDto)[];

  @ApiProperty({ type: [TokenDto] })
  choices: TokenDto[];

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  answerBySlot: Record<string, string>;

  @ApiProperty({ type: [String] })
  slotIds: string[];
}

// ── SPEAK_REPEAT data ──
export class SpeakRequiredToken {
  @ApiProperty()
  id: string;
  @ApiProperty()
  t: string;
}
export class CheckDto {
  @ApiProperty({ type: [SpeakRequiredToken] })
  required: SpeakRequiredToken[];
}

export class TtsDto {
  @ApiProperty()
  text: string;
  @ApiProperty()
  locale: string;
  @ApiProperty()
  rate: number;
  @ApiProperty()
  pitch: number;
  @ApiProperty()
  autoPlay: boolean;
}
export class SpeakRepeatDataDto {
  @ApiProperty({ type: TtsDto })
  tts: TtsDto;
  @ApiProperty({ type: CheckDto })
  check: CheckDto;
}
// ── Quiz ──
export class QuizOptionDto {
  @ApiPropertyOptional()
  id: number;
  quizId: number;
  text: string;
  order: number;
}

@ApiExtraModels(
  SentenceBuildDataDto,
  SentenceClozeDataDto,
  TextPartDto,
  SlotPartDto,
  SpeakRepeatDataDto,
  TtsDto,
  CheckDto,
  SpeakRequiredToken,
)
export class QuizDto {
  id: number;

  @ApiProperty({ enum: Object.values(QuizSourceType) })
  sourceType: QuizSourceType;

  sourceId: number;

  @ApiProperty({ enum: Object.values(QuizType) })
  type: QuizType;

  questionEnglish: string;
  questionKorean?: string;
  answerIndex?: number;
  description?: string;

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(SentenceBuildDataDto) },
      { $ref: getSchemaPath(SentenceClozeDataDto) },
      { $ref: getSchemaPath(SpeakRepeatDataDto) },
    ],
  })
  data?:
    | SentenceBuildDataDto
    | SentenceClozeDataDto
    | SpeakRepeatDataDto
    | Record<string, any>;

  order?: number;
  isActive: boolean;
}
