import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import {
  DialogueSpeakerRole,
  DialogueType,
  EpisodeStage,
  PlayEpisodeMode,
  PlayEpisodeStatus,
  QuizSourceType,
  SlotDialogueType,
  SlotMessageType,
  SlotStatus,
} from '@/generated/prisma/enums';
import { OpenAiService } from '@/modules/ai/openai.service';
import {
  CharacterImageMap,
  CharacterService,
} from '@/modules/character/character.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QuizService } from '@/modules/quiz/quiz.service';
import {
  DialogueDto,
  EpisodeDetailDto,
} from '@/modules/story/dto/episode-detail.dto';
import { StoryService } from '@/modules/story/story.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildCorrectAndDialoguesPrompt,
  ReplyMode,
} from './ai/correctAndDialogues.prompt';
import { CorrectAndDialoguesResponseZ } from './ai/correctAndDialogues.schema';
import { buildGenerateDialoguesPrompt } from './ai/generateDialogues.prompt';
import { GenerateDialoguesResponseZ } from './ai/generateDialogues.schema';
import { buildPickSentencesForQuizPrompt } from './ai/pickSentencesForQuiz.prompt';
import { PickSentencesForQuizResponseZ } from './ai/pickSentencesForQuiz.schema';
import {
  AiInputSlotDto,
  AiInputSlotResponseDto,
  AiSlotResponseDto,
  CompletePlayResponseDto,
  MyPlayEpisodeItemDto,
  PlayEpisodeDetailResponseDto,
  ResultResponseDto,
  SlotDialogueDto,
} from './dto/play.dto';
import { UpdatePlayDto } from './dto/update-play.dto';

@Injectable()
export class PlayService {
  constructor(
    private prisma: PrismaService,
    private openAiService: OpenAiService,
    private quizService: QuizService,
    private storyService: StoryService,
    private characterService: CharacterService
  ) {}

  async getMyPlayEpisodes(
    userId: number,
    query: { cursor?: number; limit?: number }
  ): Promise<CursorResponseDto<MyPlayEpisodeItemDto>> {
    const limit = query.limit ?? 9;
    const take = limit + 1;

    const plays = await this.prisma.userPlayEpisode.findMany({
      where: {
        userId,
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      include: {
        episode: true,
      },
      orderBy: { id: 'desc' },
      take,
    });

    const hasNextPage = plays.length > limit;
    if (hasNextPage) plays.pop();

    const items = plays.map((play) => ({
      playEpisodeId: play.id,
      episode: play.episode,
      mode: play.mode,
      currentStage: play.currentStage,
      status: play.status,
      startedAt: play.startedAt.toISOString(),
      completedAt: play.completedAt?.toISOString() ?? null,
      lastSceneId: play.lastSceneId ?? null,
      lastSlotId: play.lastSlotId ?? null,
      resultSummary: play.result ?? null,
    }));

    const nextCursor = hasNextPage ? plays[plays.length - 1].id : null;
    return new CursorResponseDto(items, nextCursor);
  }

  async updateProgress(
    userId: number,
    playEpisodeId: number,
    dto: UpdatePlayDto
  ): Promise<{ success: boolean }> {
    const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

    await this.prisma.userPlayEpisode.update({
      where: { id: play.id },
      data: {
        ...(dto.lastSceneId !== undefined && { lastSceneId: dto.lastSceneId }),
        ...(dto.lastSlotId !== undefined && { lastSlotId: dto.lastSlotId }),
        ...(dto.currentStage !== undefined && {
          currentStage: dto.currentStage,
        }),
        ...(dto.data !== undefined && { data: dto.data }),
      },
    });

    return { success: true };
  }

  async getPlayEpisode(
    userId: number,
    playEpisodeId: number
  ): Promise<PlayEpisodeDetailResponseDto> {
    const [play, user] = await Promise.all([
      this.fetchPlayEpisode(userId, playEpisodeId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, selectedCharacterId: true },
      }),
    ]);

    // completed: 모든 slot 치환 / in-progress: lastSlotId 이하 slot만 치환
    // → 어느 경우든 이미 플레이한 AI slot 마커는 runtime dialogues로 대체
    const episode = await this.buildEpisodeWithRuntimeDialogues(
      play.episodeId,
      playEpisodeId,
      play.status === PlayEpisodeStatus.COMPLETED ? null : play.lastSlotId
    );

    if (!episode) throw new NotFoundException('Episode not found');

    // USER speakerRole 대화에 유저 캐릭터 정보 주입
    if (user?.selectedCharacterId) {
      const userImageMap = await this.characterService.buildImageMap([
        user.selectedCharacterId,
      ]);
      episode.scenes = episode.scenes.map((scene) => ({
        ...scene,
        dialogues: scene.dialogues.map((d) => {
          if (d.speakerRole !== DialogueSpeakerRole.USER) return d;
          return {
            ...d,
            characterId: user.selectedCharacterId!,
            characterName: user.name ?? undefined,
            imageUrl:
              this.characterService.resolveImageUrl(
                userImageMap,
                user.selectedCharacterId!,
                d.charImageLabel
              ) ?? d.imageUrl,
          };
        }),
      }));
    }

    return {
      play: {
        id: play.id,
        episodeId: play.episodeId,
        mode: play.mode,
        status: play.status,
        startedAt: play.startedAt.toISOString(),
        completedAt: play.completedAt?.toISOString() ?? null,
        lastSceneId: play.lastSceneId ?? null,
        lastSlotId: play.lastSlotId ?? null,
        currentStage: play.currentStage,
      },
      episode,
    };
  }

  /**
   * AI_SLOT / AI_INPUT_SLOT 마커를 runtime slot dialogues로 치환한 episode를 반환.
   *
   * - lastSlotId가 null이면 모든 ENDED slot을 치환 (completed 케이스)
   * - lastSlotId가 있으면 해당 slot의 order 이하인 ENDED slot만 치환 (in-progress 케이스)
   * - lastSlotId가 undefined이면 slot 없음 → 마커 그대로 반환
   */
  private async buildEpisodeWithRuntimeDialogues(
    episodeId: number,
    playEpisodeId: number,
    lastSlotId: number | null | undefined
  ): Promise<EpisodeDetailDto> {
    const episode = await this.storyService.getEpisodeDetail(episodeId);

    // lastSlotId가 undefined면 아직 아무 slot도 플레이 안 한 것 → 치환 없이 반환
    if (lastSlotId === undefined) {
      return episode;
    }

    // lastSlotId가 있으면 해당 slot의 order를 조회해서 필터 기준으로 사용
    let maxOrder: number | undefined;
    if (lastSlotId !== null) {
      const lastSlot = await this.prisma.playEpisodeSlot.findUnique({
        where: { id: lastSlotId },
        select: { order: true },
      });
      maxOrder = lastSlot?.order ?? undefined;
    }

    const slots = await this.prisma.playEpisodeSlot.findMany({
      where: {
        playEpisodeId,
        status: SlotStatus.ENDED,
        ...(maxOrder !== undefined ? { order: { lte: maxOrder } } : {}),
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: {
        slotDialogues: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            type: true,
            messageType: true,
            characterId: true,
            characterName: true,
            englishText: true,
            koreanText: true,
            charImageLabel: true,
          },
        },
      },
    });

    // runtime 캐릭터 imageMap 빌드
    const runtimeCharIds = new Set<number>();
    for (const slot of slots) {
      for (const d of slot.slotDialogues) {
        if (d.characterId) runtimeCharIds.add(d.characterId);
      }
    }
    const imageMap = await this.characterService.buildImageMap([
      ...runtimeCharIds,
    ]);

    // markerDialogueId → slot 매핑
    const slotByMarker = new Map<number, (typeof slots)[number]>();
    for (const slot of slots) slotByMarker.set(slot.dialogueId, slot);

    const AI_SLOT_TYPES = new Set<string>([
      DialogueType.AI_INPUT_SLOT,
      DialogueType.AI_SLOT,
    ]);

    const mergedScenes = episode.scenes.map((scene) => {
      const dialogues: DialogueDto[] = [];

      for (const d of scene.dialogues) {
        // AI slot이 아니면 스크립트 그대로
        if (!AI_SLOT_TYPES.has(String(d.type))) {
          dialogues.push(d);
          continue;
        }

        const slot = slotByMarker.get(d.id);
        // slot 없으면 마커 유지
        if (!slot) {
          dialogues.push(d);
          continue;
        }

        // slot dialogues로 치환
        for (const rd of slot.slotDialogues) {
          const imageUrl = rd.characterId
            ? (this.characterService.resolveImageUrl(
                imageMap,
                rd.characterId,
                rd.charImageLabel
              ) ?? undefined)
            : undefined;

          dialogues.push({
            id: d.id,
            order: d.order,
            type: rd.type as unknown as DialogueType,
            speakerRole:
              rd.messageType === SlotMessageType.USER
                ? DialogueSpeakerRole.USER
                : DialogueSpeakerRole.SYSTEM,
            characterId: rd.characterId ?? undefined,
            characterName: rd.characterName ?? undefined,
            englishText: rd.englishText ?? '',
            koreanText: rd.koreanText ?? '',
            charImageLabel: rd.charImageLabel ?? undefined,
            imageUrl,
            audioUrl: undefined,
          });
        }
      }

      return { ...scene, dialogues };
    });

    return { ...episode, scenes: mergedScenes };
  }

  /**
   * USER_INPUT marker에서 유저 캐릭터 + NPC 캐릭터(들)을 resolve.
   *
   * dialogue.data에 저장된 JSON:
   *   - partnerCharacterIds: number[]  (멀티 캐릭터)
   *   - partnerCharacterId: number     (레거시 1:1)
   *   - replyMode?: 'auto' | 'specific' | 'round_robin'
   *   - responderIds?: number[]        (specific 모드 전용)
   *   - constraints?: string[]
   *   - situation?: string
   */
  private async resolveDialogueData(
    dialogue: any | null,
    userInfo?: { selectedCharacterId?: number | null; name?: string | null }
  ) {
    if (!dialogue) throw new NotFoundException('Dialogue not found');
    if (!dialogue.characterId && dialogue.speakerRole !== 'USER')
      throw new BadRequestException('Dialogue must have characterId');
    const data = dialogue.data as Record<string, any>;
    const isUserSpeaker = dialogue.speakerRole === 'USER';
    const includeDialogues =
      (data.includeDialogues as boolean | undefined) ?? false;
    // NPC 캐릭터 ID 목록: 멀티 우선, 레거시 폴백
    const npcCharacterIds: number[] = data.partnerCharacterIds?.length
      ? data.partnerCharacterIds
      : data.partnerCharacterId
        ? [data.partnerCharacterId]
        : [];

    // USER speakerRole이면 selectedCharacterId, 아니면 dialogue.characterId
    const userCharId = isUserSpeaker
      ? (userInfo?.selectedCharacterId ?? null)
      : (dialogue.characterId ?? null);

    const allCharIds = [
      ...npcCharacterIds,
      ...(userCharId ? [userCharId] : []),
    ];

    const characters = await this.prisma.character.findMany({
      where: { id: { in: allCharIds } },
      select: {
        id: true,
        name: true,
        personality: true,
        aiPrompt: true,
      },
    });
    const charMap = new Map(characters.map((c) => [c.id, c]));

    const userChar = userCharId ? charMap.get(userCharId) : null;
    const npcChars = npcCharacterIds
      .map((id) => charMap.get(id))
      .filter(Boolean) as typeof characters;
    const dataTablePrompt = data.dataTablePrompt ?? '';
    return {
      userCharacter: {
        characterId: userCharId,
        name: isUserSpeaker
          ? (userInfo?.name ?? userChar?.name ?? 'User')
          : (dialogue.characterName ?? userChar?.name ?? 'User'),
        personality: userChar?.personality ?? null,
      },
      npcCharacters: npcChars.map((c) => ({
        characterId: c.id,
        name: c.name,
        personality: c.personality ?? null,
      })),
      replyMode: (data.replyMode as ReplyMode) ?? 'auto',
      responderIds: data.responderIds as number[] | undefined,
      constraints: data.constraints as string[] | undefined,
      situation: data.situation as string | undefined,
      sceneId: dialogue.sceneId,
      markerOrder: dialogue.order,
      includeDialogues,
      dataTablePrompt,
    };
  }

  async handleAiSlot(
    userId: number,
    playEpisodeId: number,
    dialogueId: number
  ): Promise<AiSlotResponseDto> {
    const [playEpisode, user] = await Promise.all([
      this.assertAccessiblePlayEpisode(userId, playEpisodeId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, selectedCharacterId: true },
      }),
    ]);
    const dialogue = await this.prisma.dialogue.findUniqueOrThrow({
      where: { id: dialogueId },
    });
    if (!dialogue) throw new NotFoundException('Dialogue not found');

    const dialogueData = await this.resolveDialogueData(dialogue, user ?? undefined);

    const slotOrder = await this.prisma.playEpisodeSlot.count({
      where: { playEpisodeId },
    });
    return this.prisma.$transaction(
      async (tx) => {
        const slot = await tx.playEpisodeSlot.create({
          data: {
            playEpisodeId,
            dialogueId,
            order: slotOrder,
            status: SlotStatus.ACTIVE,
          },
          select: { id: true, dialogueId: true },
        });

        const prompt = buildGenerateDialoguesPrompt({
          userCharacter: dialogueData.userCharacter,
          npcCharacters: dialogueData.npcCharacters,
          situation: dialogueData.situation ?? 'Roleplay conversation',
          constraints: dialogueData.constraints,
          dataTable: playEpisode.data as Record<string, any>,
        });
        const rawText = await this.openAiService.callApi(prompt);
        console.log(prompt);
        console.log(rawText);
        let parsed: any;
        try {
          parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        } catch {
          throw new BadRequestException('AI returned invalid JSON');
        }

        const { messages, dataTable } =
          GenerateDialoguesResponseZ.parse(parsed);

        // AI 응답의 characterId를 그대로 사용하여 저장
        const savedRows: any[] = [];
        let order = 0;

        for (const m of messages) {
          const row = await tx.slotDialogue.create({
            data: {
              slotId: slot.id,
              playEpisodeId,
              sceneId: dialogue.sceneId,
              order,
              type: m.type ?? SlotDialogueType.DIALOGUE,
              messageType: m.characterId
                ? m.characterId === dialogue.characterId
                  ? SlotMessageType.USER
                  : SlotMessageType.NPC
                : SlotMessageType.SYSTEM,
              characterId: m.characterId ?? null,
              characterName: m.characterName,
              englishText: m.englishText,
              koreanText: m.koreanText ?? null,
              charImageLabel: m.charImageLabel ?? null,
            },
            select: {
              id: true,
              type: true,
              messageType: true,
              order: true,
              characterId: true,
              characterName: true,
              englishText: true,
              koreanText: true,
              charImageLabel: true,
              data: true,
              createdAt: true,
            },
          });

          savedRows.push(row);
          order++;
        }
        await tx.playEpisodeSlot.update({
          where: { id: slot.id },
          data: {
            status: SlotStatus.ENDED,
            endedAt: new Date(),
          },
        });
        // 필요시 title 도 받아와서 업데이트 해주기
        await tx.userPlayEpisode.update({
          where: { id: playEpisodeId },
          data: {
            lastSlotId: slot.id,
            data: {
              ...(playEpisode.data as Record<string, any>),
              ...dataTable,
            },
          },
        });
        // charImageLabel → imageUrl resolve용 맵
        const allCharIds = messages
          .map((m) => m.characterId)
          .filter((id): id is number => id != null);
        const imageMap = await this.characterService.buildImageMap(allCharIds);

        return {
          savedDialogues: savedRows.map((r) => this.toDialogueDto(r, imageMap)),
        };
      },
      { timeout: 15000 }
    );
  }

  private toDialogueDto(r: any, imageMap: CharacterImageMap): SlotDialogueDto {
    return {
      id: r.id,
      type: r.type,
      messageType: r.messageType,
      order: r.order,
      characterId: r.characterId ?? null,
      characterName: r.characterName ?? null,
      englishText: r.englishText ?? null,
      koreanText: r.koreanText ?? null,
      charImageLabel: r.charImageLabel ?? null,
      imageUrl: r.characterId
        ? this.characterService.resolveImageUrl(
            imageMap,
            r.characterId,
            r.charImageLabel
          )
        : null,
      data: r.data ?? null,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    };
  }

  /**
   * ✅ handleUserInput 최종:
   * - 요청: { playEpisodeId, dialogueId(USER_INPUT), text }
   * - 응답: { slotId, markerDialogueId, responderCharacterId, savedDialogues[] }
   *
   * 저장 정책(중요):
   * - 유저 발화도 "주인공 캐릭터"로 저장 (characterId = userCharacterId)
   *   → 프론트에서 말풍선/프로필/보이스 매핑 쉬움
   * - AI 발화는 responderCharacterId로 저장
   */
  async handleAiInputSlot(
    userId: number,
    playEpisodeId: number,
    dto: AiInputSlotDto
  ): Promise<AiInputSlotResponseDto> {
    const { dialogueId, text } = dto;
    if (!text) throw new BadRequestException('userText is empty');
    const dialogue = await this.prisma.dialogue.findUnique({
      where: { id: dialogueId },
      select: {
        sceneId: true,
        order: true,
        characterId: true,
        characterName: true,
        speakerRole: true,
        data: true,
      },
    });
    if (!dialogue) throw new NotFoundException('Dialogue not found');

    const [play, user] = await Promise.all([
      this.assertAccessiblePlayEpisode(userId, playEpisodeId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, selectedCharacterId: true },
      }),
    ]);

    const dialogueData = await this.resolveDialogueData(dialogue, user ?? undefined);

    const slotOrder = await this.prisma.playEpisodeSlot.count({
      where: { playEpisodeId },
    });

    const npcCharacterIds = dialogueData.npcCharacters.map(
      (c) => c.characterId
    );

    return this.prisma.$transaction(
      async (tx) => {
        const slot = await tx.playEpisodeSlot.create({
          data: {
            playEpisodeId,
            dialogueId,
            order: slotOrder,
            status: SlotStatus.ACTIVE,
          },
          select: { id: true, dialogueId: true },
        });

        let messagesInTheScene: {
          englishText: string;
          characterName: string;
        }[] = [];
        if (dialogueData.includeDialogues) {
          const playDialogues = await tx.slotDialogue.findMany({
            where: { sceneId: dialogue.sceneId, playEpisodeId },
            select: { englishText: true, characterName: true },
            orderBy: { order: 'asc' },
          });
          messagesInTheScene = playDialogues.map((d) => ({
            characterName: d.characterName ?? '',
            englishText: d.englishText ?? '',
          }));
        }

        const prompt = buildCorrectAndDialoguesPrompt({
          userCharacter: dialogueData.userCharacter,
          npcCharacters: dialogueData.npcCharacters,
          situation: dialogueData.situation ?? 'Roleplay conversation',
          userText: text,
          replyMode: dialogueData.replyMode,
          responderIds: dialogueData.responderIds,
          dataTablePrompt: dialogueData.dataTablePrompt,
          constraints: dialogueData.constraints,
          messagesInTheScene,
          dataTable: play.data as Record<string, any>,
        });
        const rawText = await this.openAiService.callApi(prompt);
        console.log(prompt);
        console.log(rawText);
        let parsed: any;
        try {
          parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        } catch {
          throw new BadRequestException('AI returned invalid JSON');
        }

        const { messages, evaluation, dataTable } =
          CorrectAndDialoguesResponseZ.parse(parsed);

        // charImageLabel → imageUrl resolve용 맵
        const aiCharIds = messages
          .map((m) => m.characterId)
          .filter((id): id is number => id != null);
        const extraIds = user?.selectedCharacterId
          ? [user.selectedCharacterId]
          : [];
        const imageMap = await this.characterService.buildImageMap([
          ...new Set([...aiCharIds, ...extraIds]),
        ]);

        // AI 응답의 characterId를 그대로 사용하되, USER 타입은 유저 캐릭터로 매핑
        const savedRows: any[] = [];
        let order = 0;

        for (const m of messages) {
          const messageType = m.characterId
            ? m.characterId === dialogue.characterId
              ? SlotMessageType.USER
              : SlotMessageType.NPC
            : SlotMessageType.SYSTEM;
          const isUserMessage = messageType === SlotMessageType.USER;

          const row = await tx.slotDialogue.create({
            data: {
              slotId: slot.id,
              playEpisodeId,
              sceneId: dialogue.sceneId,
              order,
              type: m.type ?? SlotDialogueType.DIALOGUE,
              messageType,
              characterId: isUserMessage
                ? (user?.selectedCharacterId ?? m.characterId ?? null)
                : (m.characterId ?? null),
              characterName: isUserMessage
                ? (user?.name ?? m.characterName)
                : m.characterName,
              englishText: m.englishText,
              koreanText: m.koreanText ?? null,
              charImageLabel: m.charImageLabel ?? null,
            },
            select: {
              id: true,
              type: true,
              messageType: true,
              order: true,
              characterId: true,
              characterName: true,
              englishText: true,
              koreanText: true,
              charImageLabel: true,
              data: true,
              createdAt: true,
            },
          });
          console.log(row);

          savedRows.push(row);
          order++;
        }

        await tx.playEpisodeSlot.update({
          where: { id: slot.id },
          data: {
            status: SlotStatus.ENDED,
            endedAt: new Date(),
            data: {
              ...(evaluation ? { evaluation } : {}),
              userInput: text,
            },
          },
        });

        await tx.userPlayEpisode.update({
          where: { id: playEpisodeId },
          data: {
            lastSlotId: slot.id,
            data: { ...(play.data as Record<string, any>), ...dataTable },
          },
        });

        return {
          dialogueId: slot.dialogueId,
          slotId: slot.id,
          markerDialogueId: slot.dialogueId,
          npcCharacterIds,
          savedDialogues: savedRows.map((r) => this.toDialogueDto(r, imageMap)),
        };
      },
      { timeout: 15000 }
    );
  }

  /**
   * 완료 시점에 하는 일(최소):
   * - 진행중 ACTIVE slot 있으면 ENDED 처리
   * - playEpisode.completedAt / isCompleted / currentStage 업데이트
   * - 결과 요약(result) 생성(최소: evaluation aggregate)해서 play.result에 저장
   * - mode=CHAT_WITH_QUIZ면 currentStage를 QUIZ_IN_PROGRESS로 넘기거나,
   *   퀴즈 생성 로직을 호출해서 QUIZ_IN_PROGRESS로 전환
   */
  async completePlayEpisode(
    userId: number,
    playEpisodeId: number
  ): Promise<CompletePlayResponseDto> {
    const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

    // 이미 완료면 그대로 반환
    if (play.status === PlayEpisodeStatus.COMPLETED) {
      return {
        playEpisodeId: play.id,
        currentStage: play.currentStage,
        status: play.status,
      };
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1) ACTIVE slot 강제 종료(혹시 남아있으면)
        const now = new Date();
        await tx.playEpisodeSlot.updateMany({
          where: {
            playEpisodeId,
            status: SlotStatus.ACTIVE,
          },
          data: {
            status: SlotStatus.ENDED,
            endedAt: now,
          },
        });

        // 2) slot에서 evaluation 모아서 간단 결과 만들기(없으면 null)
        const slots = await tx.playEpisodeSlot.findMany({
          where: { playEpisodeId },
          select: { data: true },
          orderBy: { id: 'asc' },
        });

        // evaluation이 slot.data.evaluation에 있다고 가정
        const evals = slots
          .map((s) => (s.data as any)?.evaluation)
          .filter(Boolean);

        const avg = (key: string) => {
          const nums = evals
            .map((e: any) => e?.[key])
            .filter((v: any) => typeof v === 'number');
          if (!nums.length) return null;
          const sum = nums.reduce((a: number, b: number) => a + b, 0);
          return Math.round(sum / nums.length);
        };

        const result = evals.length
          ? {
              overallScore: avg('overallScore'),
              grammarScore: avg('grammarScore'),
              fluencyScore: avg('fluencyScore'),
              naturalnessScore: avg('naturalnessScore'),
              turns: evals.length,
              generatedAt: now.toISOString(),
            }
          : null;

        // 3) 모드에 따른 stage 전환
        const nextStage =
          play.mode === PlayEpisodeMode.CHAT_WITH_QUIZ
            ? EpisodeStage.QUIZ_IN_PROGRESS
            : EpisodeStage.STORY_COMPLETED;

        // 4) play 업데이트
        const updated = await tx.userPlayEpisode.update({
          where: { id: playEpisodeId },
          data: {
            completedAt: now,
            status: PlayEpisodeStatus.COMPLETED,
            currentStage: nextStage,
            result: result ?? undefined,
          },
          select: {
            id: true,
            currentStage: true,
            status: true,
            result: true,
          },
        });

        // 5) 퀴즈가 필요한 모드면 여기서 생성 트리거(너 테이블 있다고 했으니 연결만)
        // TODO: mode === CHAT_WITH_QUIZ 인 경우:
        // - episode/scene/dialogue 기반으로 퀴즈 생성
        // - UserQuizSession 생성/연결
        // - nextStage 유지(QUIZ_IN_PROGRESS)

        if (play.mode === PlayEpisodeMode.CHAT_WITH_QUIZ) {
          const slotData = await this.prisma.playEpisodeSlot.findMany({
            where: { playEpisodeId },
            select: {
              slotDialogues: {
                select: {
                  englishText: true,
                },
              },
            },
          });

          const slotSentences = slotData.flatMap((s) =>
            s.slotDialogues.map((d) => d.englishText ?? '')
          );

          const prompt = buildPickSentencesForQuizPrompt(slotSentences);
          const rawText = await this.openAiService.callApi(prompt);
          console.log(prompt);
          console.log(rawText);
          let parsed: any;
          try {
            parsed =
              typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
          } catch {
            throw new BadRequestException('AI returned invalid JSON');
          }

          const { results } = PickSentencesForQuizResponseZ.parse(parsed);

          await this.quizService.generateQuizzes(
            results,
            playEpisodeId,
            QuizSourceType.PLAY
          );
        }

        return {
          playEpisodeId: updated.id,
          currentStage: updated.currentStage,
          status: updated.status,
          result: updated.result ?? null,
        };
      },
      { timeout: 15000 }
    );
  }

  // async getReplayData(
  //   userId: number,
  //   playEpisodeId: number
  // ): Promise<ReplayResponseDto> {
  //   const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

  //   // 1) 스크립트(episode -> scenes -> dialogues)
  //   const episode = await this.prisma.episode.findUnique({
  //     where: { id: play.episodeId },
  //     select: {
  //       id: true,
  //       title: true,
  //       koreanTitle: true,
  //       scenes: {
  //         orderBy: { order: 'asc' },
  //         select: {
  //           id: true,
  //           order: true,
  //           title: true,
  //           koreanTitle: true,
  //           dialogues: {
  //             orderBy: { order: 'asc' },
  //             select: {
  //               id: true,
  //               order: true,
  //               type: true,
  //               characterId: true,
  //               characterName: true,
  //               englishText: true,
  //               koreanText: true,
  //               charImageLabel: true,
  //               imageUrl: true,
  //               audioUrl: true,
  //               data: true,
  //               sceneId: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!episode) throw new NotFoundException('Episode not found');

  //   // 2) 런타임 slot + slot dialogues
  //   const slots = await this.prisma.playEpisodeSlot.findMany({
  //     where: { playEpisodeId },
  //     orderBy: [{ order: 'asc' }, { id: 'asc' }],
  //     select: {
  //       id: true,
  //       dialogueId: true,
  //       order: true,
  //       status: true,
  //       data: true,
  //       endedAt: true,
  //       slotDialogues: {
  //         orderBy: { order: 'asc' },
  //         select: {
  //           id: true,
  //           order: true,
  //           type: true,
  //           characterId: true,
  //           characterName: true,
  //           englishText: true,
  //           koreanText: true,
  //           charImageLabel: true,
  //           data: true,
  //           createdAt: true,
  //         },
  //       },
  //     },
  //   });

  //   // 3) 이미지 맵 빌드 (스크립트 + 런타임 캐릭터 전부)
  //   const allCharIds = new Set<number>();
  //   for (const scene of episode.scenes) {
  //     for (const d of scene.dialogues) {
  //       if (d.characterId) allCharIds.add(d.characterId);
  //     }
  //   }
  //   for (const slot of slots) {
  //     for (const d of slot.slotDialogues) {
  //       if (d.characterId) allCharIds.add(d.characterId);
  //     }
  //   }
  //   const imageMap = await this.characterService.buildImageMap([...allCharIds]);

  //   // 4) markerDialogueId -> slot 매핑
  //   const slotByMarker = new Map<number, (typeof slots)[number]>();
  //   for (const s of slots) slotByMarker.set(s.dialogueId, s);

  //   // 5) scenes 조합: AI_INPUT_SLOT / AI_SLOT → 런타임 대화로 치환
  //   const AI_SLOT_TYPES = new Set(['AI_INPUT_SLOT', 'AI_SLOT']);

  //   const insertedScenes = episode.scenes.map((scene) => {
  //     const newDialogues: any[] = [];

  //     for (const d of scene.dialogues) {
  //       const isAiSlot = AI_SLOT_TYPES.has(String(d.type));

  //       if (!isAiSlot) {
  //         // 스크립트 대화: 이미지 resolve
  //         const imageUrl =
  //           d.imageUrl ??
  //           (d.characterId
  //             ? (this.characterService.resolveImageUrl(
  //                 imageMap,
  //                 d.characterId,
  //                 d.charImageLabel
  //               ) ?? null)
  //             : null);

  //         newDialogues.push({ ...d, imageUrl, source: 'script' });
  //         continue;
  //       }

  //       const slot = slotByMarker.get(d.id);

  //       // slot 없으면 placeholder 유지
  //       if (!slot) {
  //         newDialogues.push({ ...d, source: 'script' });
  //         continue;
  //       }

  //       // slot 있으면: 런타임 말풍선으로 치환
  //       for (const rd of slot.slotDialogues) {
  //         const imageUrl = rd.characterId
  //           ? (this.characterService.resolveImageUrl(
  //               imageMap,
  //               rd.characterId,
  //               rd.charImageLabel
  //             ) ?? null)
  //           : null;

  //         newDialogues.push({
  //           id: d.id,
  //           order: d.order,
  //           type: rd.type,
  //           sceneId: d.sceneId,
  //           characterId: rd.characterId ?? null,
  //           characterName: rd.characterName ?? null,
  //           englishText: rd.englishText ?? '',
  //           koreanText: rd.koreanText ?? null,
  //           charImageLabel: rd.charImageLabel ?? null,
  //           imageUrl,
  //           audioUrl: null,
  //           data: {
  //             ...((rd.data as Record<string, any>) ?? {}),
  //             runtimeId: rd.id,
  //             runtimeOrder: rd.order,
  //             slotId: slot.id,
  //             markerDialogueId: slot.dialogueId,
  //           },
  //           source: 'runtime',
  //         });
  //       }
  //     }

  //     return { ...scene, dialogues: newDialogues };
  //   });

  //   return {
  //     play: {
  //       id: play.id,
  //       episodeId: play.episodeId,
  //       mode: play.mode,
  //       currentStage: play.currentStage,
  //       isCompleted: play.isCompleted,
  //       startedAt: play.startedAt.toISOString(),
  //       completedAt: play.completedAt ? play.completedAt.toISOString() : null,
  //     },
  //     episode: {
  //       id: episode.id,
  //       title: episode.title,
  //       koreanTitle: episode.koreanTitle ?? null,
  //       scenes: insertedScenes,
  //     },
  //   } as any;
  // }

  /**
   * 결과 조회:
   * - play.result (complete에서 만들어둔 요약)
   * - 필요하면 slot evaluation들을 같이 내려줄 수도 있음(옵션)
   */
  async getResult(
    userId: number,
    playEpisodeId: number
  ): Promise<ResultResponseDto> {
    const play = await this.fetchPlayEpisode(userId, playEpisodeId);

    // 아직 완료 전인데 결과 요청하면(정책 선택)
    if (!play.result) {
      // mode가 EVAL 포함이면 중간결과라도 만들 수 있는데, 지금은 명확히 에러로 둠
      throw new BadRequestException('Result not ready');
    }

    const episode = await this.prisma.episode.findUnique({
      where: { id: play.episodeId },
      select: {
        id: true,
        title: true,
        koreanTitle: true,
      },
    });

    const slots = await this.prisma.playEpisodeSlot.findMany({
      where: { playEpisodeId },
      select: {
        data: true,
        slotDialogues: {
          select: {
            type: true,
            messageType: true,
            englishText: true,
            koreanText: true,
            data: true,
          },
        },
      },
    });

    const correctedDialogues = slots.map((s) => {
      const slotData = s.data as any;
      const userDialogue = s.slotDialogues.find(
        (d) => d.messageType === SlotMessageType.USER
      );
      return {
        userInput: slotData?.userInput ?? '',
        englishText: userDialogue?.englishText ?? '',
        koreanText: userDialogue?.koreanText ?? '',
        evaluation: slotData?.evaluation ?? null,
        type: slotData?.type ?? 'correction',
      };
    });

    if (!episode) throw new NotFoundException('Episode not found');

    return {
      playEpisodeId: play.id,
      episode,
      currentStage: play.currentStage,
      status: play.status,
      result: play.result ?? null,
      correctedDialogues,
    };
  }

  private async assertAccessiblePlayEpisode(
    userId: number,
    playEpisodeId: number
  ) {
    const play = await this.fetchPlayEpisode(userId, playEpisodeId);
    if (play.status !== PlayEpisodeStatus.IN_PROGRESS)
      throw new ForbiddenException('Not active');
    return play;
  }

  private async fetchPlayEpisode(userId: number, playEpisodeId: number) {
    const play = await this.prisma.userPlayEpisode.findUnique({
      where: { id: playEpisodeId },
      select: {
        id: true,
        userId: true,
        episodeId: true,
        mode: true,
        currentStage: true,
        status: true,
        startedAt: true,
        completedAt: true,
        result: true,
        data: true,
        lastSceneId: true,
        lastSlotId: true,
      },
    });

    if (!play) throw new NotFoundException('Play episode not found');
    if (play.userId !== userId)
      throw new ForbiddenException('Not your play episode');
    return play;
  }
}
