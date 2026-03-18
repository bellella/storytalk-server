import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import {
  CharacterRelationStatus,
  DialogueSpeakerRole,
  DialogueType,
  EpisodeStage,
  PlayEpisodeMode,
  PlayEpisodeSlotType,
  PlayEpisodeStatus,
  QuizSourceType,
  RewardType,
  SceneFlowType,
  SlotDialogueType,
  SlotMessageType,
  SlotStatus,
  XpSourceType,
  XpTriggerType,
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
  prepareCorrectAndDialoguesVariables,
} from './ai/correctAndDialogues.prompt';
import { CorrectAndDialoguesResponseZ } from './ai/correctAndDialogues.schema';
import {
  buildGenerateDialoguesPrompt,
  prepareGenerateDialoguesVariables,
} from './ai/generateDialogues.prompt';
import { GenerateDialoguesResponseZ } from './ai/generateDialogues.schema';
import {
  buildPickSentencesForQuizPrompt,
  preparePickSentencesForQuizVariables,
} from './ai/pickSentencesForQuiz.prompt';
import { PickSentencesForQuizResponseZ } from './ai/pickSentencesForQuiz.schema';
import {
  buildEvaluateSlotsPrompt,
  prepareEvaluateSlotsVariables,
} from './ai/evaluateSlots.prompt';
import {
  EvaluateSlotsResponse,
  EvaluateSlotsResponseZ,
} from './ai/evaluateSlots.schema';
import {
  AiInputSlotDto,
  AiInputSlotResponseDto,
  AiSlotResponseDto,
  BranchTriggerDto,
  BranchTriggerResponseDto,
  ChoiceSlotDto,
  ChoiceSlotResponseDto,
  EndingInfoDto,
  EvaluationResultDto,
  MyPlayEpisodeItemDto,
  PlayEpisodeDetailResponseDto,
  PlayResultDto,
  ResultResponseDto,
  SlotDialogueDto,
  UserEndingItemDto,
} from './dto/play.dto';
import { UpdatePlayDto } from './dto/update-play.dto';
import { AiSlotDialogueData, AiSlotDialogueInput } from './types/ai.type';
import { BranchTriggerSceneData } from './types/scene-data.type';
import { PromptTemplateService } from '@/modules/prompt-template/prompt-template.service';

const PROMPT_KEYS = {
  AI_SLOT_GENERATE_DIALOGUES: 'AI_SLOT_GENERATE_DIALOGUES',
  AI_INPUT_SLOT_CORRECT_AND_DIALOGUES: 'AI_INPUT_SLOT_CORRECT_AND_DIALOGUES',
  AI_INPUT_SLOT_EVALUATE: 'AI_INPUT_SLOT_EVALUATE',
  AI_INPUT_SLOT_PICK_DIALOGUES_FOR_QUIZ:
    'AI_INPUT_SLOT_PICK_DIALOGUES_FOR_QUIZ',
} as const;

@Injectable()
export class PlayService {
  constructor(
    private prisma: PrismaService,
    private openAiService: OpenAiService,
    private quizService: QuizService,
    private storyService: StoryService,
    private characterService: CharacterService,
    private promptTemplateService: PromptTemplateService
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

  async getMyEndings(userId: number): Promise<UserEndingItemDto[]> {
    const unlocks = await this.prisma.userEnding.findMany({
      where: { userId, isActive: true },
      orderBy: { reachedAt: 'desc' },
      include: {
        episode: {
          select: {
            id: true,
            title: true,
            koreanTitle: true,
            thumbnailUrl: true,
            storyId: true,
            story: { select: { id: true, title: true } },
          },
        },
      },
    });

    const endings = await this.prisma.ending.findMany({
      where: {
        OR: unlocks.map((u) => ({
          episodeId: u.episodeId,
          key: u.endingKey,
        })),
      },
      select: { id: true, key: true, name: true, imageUrl: true, episodeId: true },
    });
    const endingMap = new Map(
      endings.map((e) => [`${e.episodeId}:${e.key}`, e])
    );

    return unlocks.map((u) => {
      const ending = endingMap.get(`${u.episodeId}:${u.endingKey}`);
      return {
        id: ending?.id ?? u.id,
        key: u.endingKey,
        name: ending?.name ?? u.endingKey,
        imageUrl: ending?.imageUrl ?? null,
        reachedCount: u.reachedCount,
        reachedAt: u.reachedAt.toISOString(),
        episode: {
          id: u.episode.id,
          title: u.episode.title,
          koreanTitle: u.episode.koreanTitle,
          thumbnailUrl: u.episode.thumbnailUrl,
          storyId: u.episode.storyId,
          storyTitle: u.episode.story?.title ?? null,
        },
      };
    });
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
    const play = await this.fetchPlayEpisode(userId, playEpisodeId);

    // completed: 모든 slot 치환 / in-progress: lastSlotId 이하 slot만 치환
    // → 어느 경우든 이미 플레이한 AI slot 마커는 runtime dialogues로 대체
    // getEpisodeDetail(userId)에서 스크립트 USER 대화 매핑 처리
    const episode = await this.buildEpisodeWithRuntimeDialogues(
      play.episodeId,
      playEpisodeId,
      play.status === PlayEpisodeStatus.COMPLETED ? null : play.lastSlotId,
      userId
    );

    if (!episode) throw new NotFoundException('Episode not found');

    // NORMAL 씬은 항상 포함, BRANCH 씬은 이미 resolve된 것만 포함
    const playData = (play.data as Record<string, any>) ?? {};
    const branchResults = (playData.branchResults ?? {}) as Record<
      string,
      { pickedSceneId?: number; pickedSceneIds?: number[] }
    >;
    const resolvedPickedSceneIds = new Set(
      Object.values(branchResults).flatMap((r) =>
        r.pickedSceneIds ?? (r.pickedSceneId != null ? [r.pickedSceneId] : [])
      )
    );
    const preloadedScenes = episode.scenes.filter(
      (s) =>
        (s.flowType !== SceneFlowType.BRANCH &&
          s.flowType !== SceneFlowType.BRANCH_AND_TRIGGER) ||
        resolvedPickedSceneIds.has(s.id)
    );

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
      episode: { ...episode, scenes: preloadedScenes },
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
    lastSlotId: number | null | undefined,
    userId?: number
  ): Promise<EpisodeDetailDto> {
    const episode = await this.storyService.getEpisodeDetail(episodeId, userId);

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

    // markerDialogueId → slot 매핑
    const slotByMarker = new Map<number, (typeof slots)[number]>();
    for (const slot of slots) slotByMarker.set(slot.dialogueId, slot);

    // CHOICE slot 처리: 선택된 follow-up dialogues 미리 로드
    const choiceSlotByDialogueId = new Map<number, (typeof slots)[number]>();
    for (const slot of slots) {
      if (slot.type === PlayEpisodeSlotType.CHOICE) {
        choiceSlotByDialogueId.set(slot.dialogueId, slot);
      }
    }

    const choiceRawDataMap = new Map<number, any>();
    if (choiceSlotByDialogueId.size) {
      const rows = await this.prisma.dialogue.findMany({
        where: { id: { in: [...choiceSlotByDialogueId.keys()] } },
        select: { id: true, data: true },
      });
      for (const r of rows) choiceRawDataMap.set(r.id, r.data);
    }

    // choice slot마다 선택된 optionKey → followUpDialogueIds 수집
    const choiceFollowUpIdsMap = new Map<number, number[]>(); // dialogueId → followUpIds
    const allFollowUpIds: number[] = [];
    for (const [dialogueId, slot] of choiceSlotByDialogueId) {
      const optionKey = (slot.data as any)?.optionKey;
      const options = ((choiceRawDataMap.get(dialogueId) as any)?.options ??
        []) as any[];
      const option = options.find((o: any) => o.key === optionKey);
      const ids: number[] = option?.followUpDialogueIds ?? [];
      choiceFollowUpIdsMap.set(dialogueId, ids);
      allFollowUpIds.push(...ids);
    }

    // follow-up dialogues 벌크 조회
    const followUpRowMap = new Map<number, any>();
    if (allFollowUpIds.length) {
      const rows = await this.prisma.dialogue.findMany({
        where: { id: { in: allFollowUpIds } },
        include: { character: true },
      });
      for (const r of rows) followUpRowMap.set(r.id, r);
    }

    // user 정보 (follow-up USER speaker 처리)
    const user =
      userId && allFollowUpIds.length
        ? await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, selectedCharacterId: true },
          })
        : null;

    // runtime 캐릭터 imageMap 빌드 (AI slot + follow-up + user 선택 캐릭터)
    const runtimeCharIds = new Set<number>();
    for (const slot of slots) {
      for (const d of slot.slotDialogues) {
        if (d.characterId) runtimeCharIds.add(d.characterId);
      }
    }
    for (const d of followUpRowMap.values()) {
      if (d.characterId) runtimeCharIds.add(d.characterId);
    }
    if (user?.selectedCharacterId) runtimeCharIds.add(user.selectedCharacterId);

    const imageMap = await this.characterService.buildImageMap([
      ...runtimeCharIds,
    ]);

    const replaceUserName = (text: string) =>
      user?.name ? text.replaceAll('{{userName}}', user.name) : text;

    const AI_SLOT_TYPES = new Set<string>([
      DialogueType.AI_INPUT_SLOT,
      DialogueType.AI_SLOT,
    ]);

    const mergedScenes = episode.scenes.map((scene) => {
      const dialogues: DialogueDto[] = [];

      for (const d of scene.dialogues) {
        // CHOICE_SLOT: 선택 기록 있으면 follow-up dialogues로 교체
        if (String(d.type) === DialogueType.CHOICE_SLOT) {
          const choiceSlot = choiceSlotByDialogueId.get(d.id);
          if (!choiceSlot) {
            dialogues.push(d); // 아직 선택 안 함 → 선택지 그대로 노출
            continue;
          }
          const followUpIds = choiceFollowUpIdsMap.get(d.id) ?? [];
          for (const fid of followUpIds) {
            const fu = followUpRowMap.get(fid);
            if (!fu) continue;
            const isUserSpeaker = fu.speakerRole === DialogueSpeakerRole.USER;
            const charId = isUserSpeaker
              ? (user?.selectedCharacterId ?? undefined)
              : (fu.characterId ?? undefined);
            const imageUrl = charId
              ? (this.characterService.resolveImageUrl(
                  imageMap,
                  charId,
                  fu.charImageLabel
                ) ?? undefined)
              : (fu.imageUrl ?? undefined);
            dialogues.push({
              id: fu.id,
              order: fu.order,
              type: fu.type,
              speakerRole: fu.speakerRole,
              characterId: charId,
              characterName: isUserSpeaker
                ? (user?.name ??
                  fu.character?.name ??
                  fu.characterName ??
                  undefined)
                : (fu.character?.name ?? fu.characterName ?? undefined),
              englishText: replaceUserName(fu.englishText ?? ''),
              koreanText: replaceUserName(fu.koreanText ?? ''),
              charImageLabel: fu.charImageLabel ?? undefined,
              imageUrl,
              audioUrl: fu.audioUrl ?? undefined,
            });
          }
          continue;
        }

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
   * AI_INPUT_SLOT / AI_SLOT marker에서 유저 캐릭터 + NPC 캐릭터(들)을 resolve.
   *
   * dialogue.data에 저장된 JSON:
   *   - partnerCharacterIds: number[]  — 대화 상대 NPC 목록
   *   - constraints?: string[]
   *   - situation?: string
   *   - includeDialogues?: boolean
   *   - dataTablePrompt?: string
   */
  private async resolveDialogueData(
    dialogue: AiSlotDialogueInput,
    userInfo?: { selectedCharacterId?: number | null; name?: string | null }
  ) {
    if (
      !dialogue.characterId &&
      dialogue.speakerRole !== DialogueSpeakerRole.USER
    )
      throw new BadRequestException('Dialogue must have characterId');
    const data: AiSlotDialogueData =
      (dialogue.data as AiSlotDialogueData | null) ?? {};
    const isUserSpeaker = dialogue.speakerRole === DialogueSpeakerRole.USER;
    const includeDialogues = data.includeDialogues ?? false;
    const npcCharacterIds: number[] = data.partnerCharacterIds ?? [];

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

    const replaceUserName = (text: string) =>
      userInfo?.name ? text.replaceAll('{{userName}}', userInfo.name) : text;

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
      constraints: data.constraints?.map((c) => replaceUserName(c)),
      situation: data.situation ? replaceUserName(data.situation) : undefined,
      sceneId: dialogue.sceneId,
      markerOrder: dialogue.order,
      includeDialogues,
      dataTablePrompt: data.dataTablePrompt ?? '',
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

    const dialogueData = await this.resolveDialogueData(
      dialogue,
      user ?? undefined
    );

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

        const genArgs = {
          userCharacter: dialogueData.userCharacter,
          npcCharacters: dialogueData.npcCharacters,
          situation: dialogueData.situation ?? 'Roleplay conversation',
          constraints: dialogueData.constraints,
          dataTable: playEpisode.data as Record<string, any>,
        };
        const prompt =
          (await this.promptTemplateService.getPromptContentOrNull(
            PROMPT_KEYS.AI_SLOT_GENERATE_DIALOGUES,
            prepareGenerateDialoguesVariables(genArgs)
          )) ?? buildGenerateDialoguesPrompt(genArgs);
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

    const dialogueData = await this.resolveDialogueData(
      dialogue,
      user ?? undefined
    );

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

        const correctArgs = {
          userCharacter: dialogueData.userCharacter,
          npcCharacters: dialogueData.npcCharacters,
          situation: dialogueData.situation ?? 'Roleplay conversation',
          userText: text,
          dataTablePrompt: dialogueData.dataTablePrompt,
          constraints: dialogueData.constraints,
          messagesInTheScene,
          dataTable: play.data as Record<string, any>,
        };
        const prompt =
          (await this.promptTemplateService.getPromptContentOrNull(
            PROMPT_KEYS.AI_INPUT_SLOT_CORRECT_AND_DIALOGUES,
            prepareCorrectAndDialoguesVariables(correctArgs)
          )) ?? buildCorrectAndDialoguesPrompt(correctArgs);
        const rawText = await this.openAiService.callApi(prompt);
        console.log(prompt);
        console.log(rawText);
        let parsed: any;
        try {
          parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
        } catch {
          throw new BadRequestException('AI returned invalid JSON');
        }

        const {
          type: inputType,
          messages,
          dataTable,
        } = CorrectAndDialoguesResponseZ.parse(parsed);

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

        // messages[0]가 유저 교정/번역 텍스트
        const correctedText = messages[0]?.englishText ?? text;

        await tx.playEpisodeSlot.update({
          where: { id: slot.id },
          data: {
            status: SlotStatus.ENDED,
            endedAt: new Date(),
            data: {
              userInput: text,
              correctedText,
              inputType,
            },
          },
        });

        const currentPlayData = (play.data as Record<string, any>) ?? {};
        const mergedData = { ...currentPlayData, ...dataTable };

        // sceneScoreDelta 처리: 기존 sceneScores에 delta 누적
        if (dataTable?.sceneScoreDelta) {
          const sceneScores = { ...(currentPlayData.sceneScores ?? {}) } as Record<string, number>;
          for (const [sceneId, delta] of Object.entries(dataTable.sceneScoreDelta as Record<string, number>)) {
            sceneScores[sceneId] = (sceneScores[sceneId] ?? 0) + delta;
          }
          mergedData.sceneScores = sceneScores;
          delete mergedData.sceneScoreDelta;
        }

        await tx.userPlayEpisode.update({
          where: { id: playEpisodeId },
          data: {
            lastSlotId: slot.id,
            data: mergedData,
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
   */
  async completePlayEpisode(
    userId: number,
    playEpisodeId: number
  ): Promise<ResultResponseDto> {
    const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

    // 이미 완료면 getResult와 동일 포맷으로 반환
    if (play.status === PlayEpisodeStatus.COMPLETED) {
      return this.getResult(userId, playEpisodeId);
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

        // 2) CHAT_WITH_EVAL 모드면 슬롯 데이터 모아서 AI 평가
        const slots = await tx.playEpisodeSlot.findMany({
          where: { playEpisodeId, type: PlayEpisodeSlotType.AI_INPUT },
          select: { data: true },
          orderBy: { id: 'asc' },
        });

        let evaluation: EvaluateSlotsResponse | null = null;

        if (play.mode === PlayEpisodeMode.ROLEPLAY_WITH_EVAL) {
          const turns = slots
            .map((s, i) => {
              const d = s.data as Record<string, any> | null;
              console.log(d, 'slot data' + i);
              if (!d?.userInput || !d?.correctedText) return null;
              return {
                index: i + 1,
                userInput: d.userInput as string,
                correctedText: d.correctedText as string,
                inputType: (d.inputType ?? 'correction') as
                  | 'correction'
                  | 'translation',
              };
            })
            .filter((t): t is NonNullable<typeof t> => t !== null);

          if (turns.length > 0) {
            const evalPrompt =
              (await this.promptTemplateService.getPromptContentOrNull(
                PROMPT_KEYS.AI_INPUT_SLOT_EVALUATE,
                prepareEvaluateSlotsVariables({ turns })
              )) ?? buildEvaluateSlotsPrompt({ turns });
            const evalRaw = await this.openAiService.callApi(evalPrompt);
            console.log(evalRaw, 'evalRaw');
            try {
              const parsed =
                typeof evalRaw === 'string' ? JSON.parse(evalRaw) : evalRaw;
              evaluation = EvaluateSlotsResponseZ.parse(parsed);
            } catch {
              // 파싱 실패 시 evaluation 없이 진행
            }
          }
        }

        // 2.5) lastSceneId로 endingId 조회 (엔딩 연결된 씬이면)
        let endingId: number | null = null;
        if (play.lastSceneId) {
          const scene = await tx.scene.findUnique({
            where: {
              id: play.lastSceneId,
              episodeId: play.episodeId,
            },
            select: { endingId: true },
          });
          endingId = scene?.endingId ?? null;
        }

        // 3) 모드에 따른 stage 전환
        const nextStage = EpisodeStage.QUIZ_IN_PROGRESS;

        // 4) 엔딩 리워드 지급 (endingId 있을 때, 중복 방지)
        const grantedRewards: { type: string; payload: any }[] = [];
        let rewardsGranted = false;

        if (endingId && !play.rewardsGranted) {
          const ending = await tx.ending.findUnique({
            where: { id: endingId },
            include: {
              rewards: { where: { isActive: true } },
            },
          });

          if (ending) {
            // UserEnding 조회: 없거나 isActive=false면 리워드 지급 가능 (유효하지 않으면 다시 지급)
            const existing = await tx.userEnding.findUnique({
              where: {
                userId_episodeId_endingKey: {
                  userId,
                  episodeId: play.episodeId,
                  endingKey: ending.key,
                },
              },
            });
            const shouldGrantRewards = !existing || !existing.isActive;

            if (shouldGrantRewards) {
              for (const reward of ending.rewards) {
                const payload = reward.payload as Record<string, any>;
                if (reward.type === RewardType.CHARACTER_INVITE) {
                  const characterId = payload.characterId as number;
                  if (characterId) {
                    const existing = await tx.characterFriend.findUnique({
                      where: {
                        userId_characterId: { userId, characterId },
                      },
                    });
                    if (!existing) {
                      await tx.characterFriend.create({
                        data: {
                          userId,
                          characterId,
                          status: CharacterRelationStatus.INVITABLE,
                        },
                      });
                      grantedRewards.push({ type: reward.type, payload });
                    } else if (
                      existing.status === CharacterRelationStatus.LOCKED
                    ) {
                      await tx.characterFriend.update({
                        where: {
                          userId_characterId: { userId, characterId },
                        },
                        data: { status: CharacterRelationStatus.INVITABLE },
                      });
                      grantedRewards.push({ type: reward.type, payload });
                    }
                  }
                }
              }
            }

            // 엔딩 도달 기록: count 증가, 지급 시 isActive=true
            await tx.userEnding.upsert({
              where: {
                userId_episodeId_endingKey: {
                  userId,
                  episodeId: play.episodeId,
                  endingKey: ending.key,
                },
              },
              create: {
                userId,
                episodeId: play.episodeId,
                endingKey: ending.key,
                reachedCount: 1,
                isActive: true,
              },
              update: {
                reachedCount: { increment: 1 },
                ...(shouldGrantRewards ? { isActive: true } : {}),
              },
            });
            rewardsGranted = true;
          }
        }

        // - episode/scene/dialogue 기반으로 퀴즈 생성
        // - UserQuizSession 생성/연결

        if (play.mode === PlayEpisodeMode.ROLEPLAY_WITH_EVAL) {
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

          const prompt =
            (await this.promptTemplateService.getPromptContentOrNull(
              PROMPT_KEYS.AI_INPUT_SLOT_PICK_DIALOGUES_FOR_QUIZ,
              preparePickSentencesForQuizVariables(slotSentences)
            )) ?? buildPickSentencesForQuizPrompt(slotSentences);
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

        // 6) XP 지급 (중복 방지)
        let xpGained = 0;
        const xpRule = await tx.xpRule.findFirst({
          where: {
            triggerType: XpTriggerType.EPISODE_COMPLETE,
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
          orderBy: { priority: 'desc' },
        });

        if (xpRule) {
          const alreadyGranted = await tx.userXpHistory.findUnique({
            where: {
              userId_sourceType_sourceId_triggerType: {
                userId,
                sourceType: XpSourceType.EPISODE,
                sourceId: play.episodeId,
                triggerType: XpTriggerType.EPISODE_COMPLETE,
              },
            },
          });

          if (!alreadyGranted) {
            await tx.userXpHistory.create({
              data: {
                userId,
                xpRuleId: xpRule.id,
                triggerType: XpTriggerType.EPISODE_COMPLETE,
                sourceType: XpSourceType.EPISODE,
                sourceId: play.episodeId,
                xpAmount: xpRule.xpAmount,
              },
            });

            const currentUser = await tx.user.findUniqueOrThrow({
              where: { id: userId },
              select: { xp: true, XpLevel: true },
            });
            const newXp = currentUser.xp + xpRule.xpAmount;
            const nextLevel = await tx.xpLevel.findFirst({
              where: { requiredTotalXp: { lte: newXp }, isActive: true },
              orderBy: { requiredTotalXp: 'desc' },
            });
            await tx.user.update({
              where: { id: userId },
              data: {
                xp: newXp,
                XpLevel: nextLevel?.level ?? currentUser.XpLevel,
              },
            });
            xpGained = xpRule.xpAmount;
          }
        }

        // 7) EpisodeReward 지급
        const episodeRewards = await tx.episodeReward.findMany({
          where: { episodeId: play.episodeId, isActive: true },
        });

        for (const reward of episodeRewards) {
          const payload = reward.payload as Record<string, any>;

          if (reward.type === RewardType.CHARACTER_INVITE) {
            const characterId = payload.characterId as number;
            if (characterId) {
              const existing = await tx.characterFriend.findUnique({
                where: { userId_characterId: { userId, characterId } },
              });
              if (!existing) {
                await tx.characterFriend.create({
                  data: {
                    userId,
                    characterId,
                    status: CharacterRelationStatus.INVITABLE,
                  },
                });
                grantedRewards.push({ type: reward.type, payload });
              } else if (existing.status === CharacterRelationStatus.LOCKED) {
                await tx.characterFriend.update({
                  where: { userId_characterId: { userId, characterId } },
                  data: { status: CharacterRelationStatus.INVITABLE },
                });
                grantedRewards.push({ type: reward.type, payload });
              }
            }
          }
        }

        // 8) play 업데이트 (result에 evaluation, xpGained, rewards 저장)
        const resultToSave = {
          ...(evaluation ? { evaluation, generatedAt: now.toISOString() } : {}),
          xpGained,
          rewards: grantedRewards,
        };
        const updated = await tx.userPlayEpisode.update({
          where: { id: playEpisodeId },
          data: {
            completedAt: now,
            status: PlayEpisodeStatus.COMPLETED,
            currentStage: nextStage,
            result: resultToSave,
            endingId: endingId ?? undefined,
            rewardsGranted,
          },
          select: {
            id: true,
            currentStage: true,
            status: true,
            result: true,
            endingId: true,
          },
        });

        // ending 정보 (프론트 표시용)
        let endingInfo: {
          id: number;
          key: string;
          name: string;
          imageUrl: string | null;
          episodeId: number;
          episodeTitle: string;
          episodeKoreanTitle: string | null;
        } | null = null;
        if (endingId) {
          const endingRow = await tx.ending.findUnique({
            where: { id: endingId },
            select: {
              id: true,
              key: true,
              name: true,
              imageUrl: true,
              episodeId: true,
              episode: { select: { title: true, koreanTitle: true } },
            },
          });
          if (endingRow) {
            endingInfo = {
              id: endingRow.id,
              key: endingRow.key,
              name: endingRow.name,
              imageUrl: endingRow.imageUrl,
              episodeId: endingRow.episodeId,
              episodeTitle: endingRow.episode.title,
              episodeKoreanTitle: endingRow.episode.koreanTitle,
            };
          }
        }

        // slots 조회 (getResult와 동일 포맷)
        const [slotRows, allSlotDialogues] = await Promise.all([
          tx.playEpisodeSlot.findMany({
            where: {
              playEpisodeId,
              type: PlayEpisodeSlotType.AI_INPUT,
            },
            select: { id: true, data: true },
            orderBy: { order: 'asc' },
          }),
          tx.slotDialogue.findMany({
            where: {
              slot: { playEpisodeId },
              messageType: SlotMessageType.USER,
            },
            select: { slotId: true, englishText: true, koreanText: true },
          }),
        ]);
        const slotDialoguesBySlotId = new Map<
          number,
          { englishText: string; koreanText: string }
        >();
        for (const d of allSlotDialogues) {
          slotDialoguesBySlotId.set(d.slotId, {
            englishText: d.englishText ?? '',
            koreanText: d.koreanText ?? '',
          });
        }
        const slotsForResult = slotRows.map((s) => {
          const slotData = (s.data ?? {}) as Record<string, any>;
          const userDialogue = slotDialoguesBySlotId.get(s.id);
          return {
            type: (slotData.type ?? 'correction') as 'correction' | 'translation',
            userInput: slotData.userInput ?? '',
            englishText: userDialogue?.englishText ?? '',
            koreanText: userDialogue?.koreanText ?? '',
            evaluation: slotData.evaluation ?? null,
          };
        });

        const episodeRow = await tx.episode.findUnique({
          where: { id: play.episodeId },
          select: { id: true, title: true, koreanTitle: true },
        });
        if (!episodeRow) throw new NotFoundException('Episode not found');

        const result: PlayResultDto = {
          evaluation: (evaluation?.aggregate ? evaluation : null) as any,
          ending: endingInfo,
          slots: slotsForResult,
          xpGained,
          rewards: grantedRewards,
        };

        return {
          playEpisodeId: updated.id,
          episode: {
            id: episodeRow.id,
            title: episodeRow.title,
            koreanTitle: episodeRow.koreanTitle ?? null,
            description: null,
            koreanDescription: null,
            thumbnailUrl: null,
          },
          currentStage: updated.currentStage,
          status: updated.status,
          result,
        };
      },
      { timeout: 60000 }
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

    // N+1 방지: slots + slotDialogues 한 번에 조회 (include 대신 병렬 2쿼리)
    const [slots, allSlotDialogues] = await Promise.all([
      this.prisma.playEpisodeSlot.findMany({
        where: {
          playEpisodeId,
          type: PlayEpisodeSlotType.AI_INPUT,
        },
        select: { id: true, data: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.slotDialogue.findMany({
        where: {
          slot: { playEpisodeId },
          messageType: SlotMessageType.USER,
        },
        select: {
          slotId: true,
          englishText: true,
          koreanText: true,
        },
      }),
    ]);

    const slotDialoguesBySlotId = new Map<number, { englishText: string; koreanText: string }>();
    for (const d of allSlotDialogues) {
      slotDialoguesBySlotId.set(d.slotId, {
        englishText: d.englishText ?? '',
        koreanText: d.koreanText ?? '',
      });
    }

    const slotsForResult = slots.map((s) => {
      const slotData = (s.data ?? {}) as Record<string, any>;
      const userDialogue = slotDialoguesBySlotId.get(s.id);
      return {
        type: (slotData.type ?? 'correction') as 'correction' | 'translation',
        userInput: slotData.userInput ?? '',
        englishText: userDialogue?.englishText ?? '',
        koreanText: userDialogue?.koreanText ?? '',
        evaluation: slotData.evaluation ?? null,
      };
    });

    if (!episode) throw new NotFoundException('Episode not found');

    const savedResult = (play.result ?? {}) as Record<string, any>;
    let endingInfo: EndingInfoDto | null = null;
    if (play.endingId) {
      const endingRow = await this.prisma.ending.findUnique({
        where: { id: play.endingId },
        select: {
          id: true,
          key: true,
          name: true,
          imageUrl: true,
          episodeId: true,
          episode: { select: { title: true, koreanTitle: true } },
        },
      });
      if (endingRow) {
        endingInfo = {
          id: endingRow.id,
          key: endingRow.key,
          name: endingRow.name,
          imageUrl: endingRow.imageUrl,
          episodeId: endingRow.episodeId,
          episodeTitle: endingRow.episode.title,
          episodeKoreanTitle: endingRow.episode.koreanTitle,
        };
      }
    }

    const result: PlayResultDto = {
      evaluation: (savedResult.evaluation ?? null) as EvaluationResultDto | null,
      ending: endingInfo,
      slots: slotsForResult,
      xpGained: savedResult.xpGained ?? 0,
      rewards: Array.isArray(savedResult.rewards) ? savedResult.rewards : [],
    };

    return {
      playEpisodeId: play.id,
      episode: {
        id: episode.id,
        title: episode.title,
        koreanTitle: episode.koreanTitle ?? null,
        description: null,
        koreanDescription: null,
        thumbnailUrl: null,
      },
      currentStage: play.currentStage,
      status: play.status,
      result,
    };
  }

  async handleChoiceSlot(
    userId: number,
    playEpisodeId: number,
    dto: ChoiceSlotDto
  ): Promise<ChoiceSlotResponseDto> {
    const { dialogueId, optionKey } = dto;
    const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

    const dialogue = await this.prisma.dialogue.findUnique({
      where: { id: dialogueId },
      select: { id: true, type: true, data: true },
    });
    if (!dialogue) throw new NotFoundException('Dialogue not found');
    if (dialogue.type !== DialogueType.CHOICE_SLOT)
      throw new BadRequestException('Dialogue is not a CHOICE_SLOT');

    const dialogueData = dialogue.data as Record<string, any>;
    const options = (dialogueData.options ?? []) as Array<{
      key: string;
      englishText: string;
      koreanText: string;
      followUpDialogueIds: number[];
      scoreDelta?: { key: string; delta: number }[];
    }>;

    // Idempotency: slot already exists → return stored result
    const existingSlot = await this.prisma.playEpisodeSlot.findFirst({
      where: { playEpisodeId, dialogueId, status: SlotStatus.ENDED },
      select: { data: true },
    });
    if (existingSlot) {
      const storedKey =
        (existingSlot.data as Record<string, any>)?.optionKey ?? optionKey;
      const storedOption = options.find((o) => o.key === storedKey);
      const followUpDialogues = storedOption?.followUpDialogueIds?.length
        ? await this.fetchFollowUpDialogues(
            storedOption.followUpDialogueIds,
            userId
          )
        : [];
      return { followUpDialogues };
    }

    const option = options.find((o) => o.key === optionKey);
    if (!option)
      throw new BadRequestException(`Invalid optionKey: ${optionKey}`);

    const followUpDialogues = option.followUpDialogueIds?.length
      ? await this.fetchFollowUpDialogues(option.followUpDialogueIds, userId)
      : [];

    const playData = (play.data as Record<string, any>) ?? {};
    const slotOrder = await this.prisma.playEpisodeSlot.count({
      where: { playEpisodeId },
    });

    await this.prisma.$transaction(async (tx) => {
      const slot = await tx.playEpisodeSlot.create({
        data: {
          playEpisodeId,
          dialogueId,
          order: slotOrder,
          type: PlayEpisodeSlotType.CHOICE,
          status: SlotStatus.ENDED,
          endedAt: new Date(),
          data: { optionKey },
        },
        select: { id: true },
      });

      // scoreDelta 누적 (key 기준으로 sceneScores에 반영)
      const sceneScores = {
        ...((playData.sceneScores ?? {}) as Record<string, number>),
      };
      for (const { key, delta } of option.scoreDelta ?? []) {
        sceneScores[key] = (sceneScores[key] ?? 0) + delta;
      }

      const branchResults = {
        ...((playData.branchResults ?? {}) as Record<string, any>),
      };
      branchResults[dialogueId] = {
        optionKey,
        createdAt: new Date().toISOString(),
      };

      await tx.userPlayEpisode.update({
        where: { id: playEpisodeId },
        data: {
          lastSlotId: slot.id,
          data: { ...playData, sceneScores, branchResults },
        },
      });
    });

    return { followUpDialogues };
  }

  private async fetchFollowUpDialogues(
    dialogueIds: number[],
    userId?: number
  ): Promise<DialogueDto[]> {
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, selectedCharacterId: true },
        })
      : null;

    const dialogues = await this.prisma.dialogue.findMany({
      where: { id: { in: dialogueIds } },
      include: { character: true },
    });

    const charIds = dialogues
      .map((d) => d.characterId)
      .filter((id): id is number => id != null);
    if (user?.selectedCharacterId) charIds.push(user.selectedCharacterId);
    const imageMap = await this.characterService.buildImageMap([
      ...new Set<number>(charIds),
    ]);

    const replaceUserName = (text: string) =>
      user?.name ? text.replaceAll('{{userName}}', user.name) : text;

    return dialogueIds
      .map((id) => dialogues.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => d != null)
      .map((d) => {
        const isUserSpeaker = d.speakerRole === 'USER';
        const characterId = isUserSpeaker
          ? (user?.selectedCharacterId ?? undefined)
          : (d.characterId ?? undefined);
        const imageUrl = characterId
          ? (this.characterService.resolveImageUrl(
              imageMap,
              characterId,
              d.charImageLabel ?? null
            ) ?? undefined)
          : (d.imageUrl ?? undefined);

        return {
          id: d.id,
          order: d.order,
          type: d.type,
          speakerRole: d.speakerRole,
          characterId,
          characterName: isUserSpeaker
            ? (user?.name ?? d.character?.name ?? d.characterName ?? undefined)
            : (d.character?.name ?? d.characterName ?? undefined),
          englishText: replaceUserName(d.englishText),
          koreanText: replaceUserName(d.koreanText),
          charImageLabel: d.charImageLabel ?? undefined,
          imageUrl,
          audioUrl: d.audioUrl ?? undefined,
        };
      });
  }

  async handleBranchTrigger(
    userId: number,
    playEpisodeId: number,
    dto: BranchTriggerDto
  ): Promise<BranchTriggerResponseDto> {
    const { sceneId: triggerSceneId } = dto;
    const play = await this.assertAccessiblePlayEpisode(userId, playEpisodeId);

    const scene = await this.prisma.scene.findUnique({
      where: { id: triggerSceneId },
      select: { id: true, flowType: true, data: true },
    });
    if (!scene) throw new NotFoundException('Scene not found');
    if (
      scene.flowType !== SceneFlowType.BRANCH_TRIGGER &&
      scene.flowType !== SceneFlowType.BRANCH_AND_TRIGGER
    )
      throw new BadRequestException('Scene is not a BRANCH_TRIGGER');

    const sceneData = (scene.data ?? {}) as unknown as BranchTriggerSceneData;
    const candidateKeys = sceneData.candidateKeys ?? [];
    const selectionMode = sceneData.selectionMode ?? 'TOP';
    const threshold = sceneData.threshold ?? 0;
    const fallbackKeys = sceneData.fallbackKeys ?? [];

    if (!candidateKeys.length)
      throw new BadRequestException(
        'BRANCH_TRIGGER scene has no candidateKeys'
      );

    const playData = (play.data as Record<string, any>) ?? {};
    const sceneScores = (playData.sceneScores ?? {}) as Record<string, number>;

    // winningKey 결정: sceneScores[key] 기준으로 선택
    let winningKey: string | undefined;

    if (selectionMode === 'TOP') {
      // threshold 이상인 candidateKeys 중 가장 높은 점수 선택
      let best = -Infinity;
      for (const key of candidateKeys) {
        const score = sceneScores[key] ?? 0;
        if (score >= threshold && score > best) {
          best = score;
          winningKey = key;
        }
      }
      // threshold 이상인 게 없으면 fallbackKeys 사용
      if (winningKey == null && fallbackKeys.length > 0) {
        winningKey = fallbackKeys[0];
      }
    }

    // 최종 폴백: 첫 번째 candidate
    if (winningKey == null) winningKey = candidateKeys[0];

    // Load full episode scenes (branchKey 포함)
    const episode = await this.storyService.getEpisodeDetail(
      play.episodeId,
      userId
    );

    const pickedScenes = episode.scenes
      .filter((s) => s.branchKey === winningKey)
      .sort((a, b) => a.order - b.order);
    if (!pickedScenes.length)
      throw new NotFoundException(
        `Scene with branchKey ${winningKey} not found in episode`
      );

    const pickedSceneIds = pickedScenes.map((s) => s.id);

    // 결과 저장 (key: triggerSceneId)
    const branchResults = {
      ...((playData.branchResults ?? {}) as Record<string, any>),
    };
    branchResults[triggerSceneId] = {
      winningKey,
      pickedSceneIds,
      createdAt: new Date().toISOString(),
    };
    await this.prisma.userPlayEpisode.update({
      where: { id: playEpisodeId },
      data: { data: { ...playData, branchResults } },
    });

    return {
      winningKey,
      pickedSceneIds,
      scenes: pickedScenes,
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
        rewardsGranted: true,
        endingId: true,
      },
    });

    if (!play) throw new NotFoundException('Play episode not found');
    if (play.userId !== userId)
      throw new ForbiddenException('Not your play episode');
    return play;
  }
}
