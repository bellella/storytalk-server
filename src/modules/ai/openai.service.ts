import {
  BuildSystemPromptData,
  GenerateCharacterResponseOptions,
  MessageContext,
} from '@/types/ai.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SendMessageOptionType } from '../chat/dto/send-message.dto';
import { AiResponse, AiResponseSchema } from './ai-response.schema';

@Injectable()
export class OpenAiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAiService.name);

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateCharacterResponse(
    options: GenerateCharacterResponseOptions
  ): Promise<AiResponse> {
    const systemPrompt =
      options.systemPrompt ??
      this.buildSystemPrompt({
        type: options.type,
        aiPrompt: options.aiPrompt,
        affinity: options.affinity,
        userName: options.userName,
        options: options.options,
      });
    const messages = this.buildMessageHistory(
      options.recentMessages,
      options.userMessage
    );
    const rawText = await this.callApi(systemPrompt, messages);
    return this.parseResponse(rawText);
  }

  buildSystemPrompt(data: BuildSystemPromptData): string {
    const { aiPrompt = '', affinity, userName, options } = data;

    const parts = [
      `Instructions: ${aiPrompt}`,
      `Friendship Level (0-100): ${affinity}`,
      userName
        ? `The user's name is "${userName}". Use their name naturally in conversation when appropriate.`
        : 'The user has not set a display name.',
    ];

    const payloadFields = [
      options?.includes(SendMessageOptionType.NEED_TRANSLATION)
        ? `    "translated": "<user message translated to English>"`
        : null,
      options?.includes(SendMessageOptionType.NEED_GRAMMAR_CORRECTION)
        ? `    "corrected": "<user message with grammar corrected>"`
        : null,
    ]
      .filter(Boolean)
      .join(',\n');

    parts.push(`
Your goal is to have a real conversation with the user.
Adjust your tone based on the friendship level (higher = more casual and warm).

CRITICAL: Respond with ONLY valid JSON. No markdown, no trailing commas, no extra text outside JSON.

Required JSON structure (follow EXACTLY):
{
  "type": "BATCH",
  "messages": [
    {
      "type": "TEXT",
      "content": "<your reply in English>",
      "translated": "<Korean translation of your reply>"
    },
    {
      "type": "STICKER",
      "content": "<one of: cat-happy | cat-sad>"
    }
  ],
  "payload": {
${payloadFields || ''}
  }
}

RULES — never break these:
1. "messages" is an array. TEXT and STICKER are SEPARATE objects inside it.
2. Every TEXT object must have exactly: "type", "content", "translated".
3. Every STICKER object must have exactly: "type", "content". No other fields.
4. Do NOT merge TEXT and STICKER into one object.
5. "payload" is always an object (empty {} if nothing to fill).
6. No trailing commas anywhere.
7. "translated" must always use informal Korean (반말).
    `);

    return parts.join('\n');
  }

  // 메시지 히스토리 생성
  buildMessageHistory(
    recentMessages: MessageContext[],
    userMessage: string
  ): ChatCompletionMessageParam[] {
    const history: ChatCompletionMessageParam[] = recentMessages
      .slice(-20)
      .map((msg) => ({
        role: msg.isFromUser ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

    history.push({ role: 'user', content: userMessage });
    return history;
  }

  // OpenAI API 호출
  async callApi(
    systemPrompt: string,
    messages?: ChatCompletionMessageParam[]
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages ? messages : []),
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    return completion.choices[0].message.content || '';
  }

  async generateQuizDataByAi(
    items: { index: number; english: string; korean: string; type: string }[]
  ): Promise<{ index: number; data: Record<string, any> }[]> {
    const systemPrompt = `You are a quiz data generator for an English learning app.
Generate quiz data for each sentence based on its assigned type.

=== SENTENCE_BUILD ===
User arranges shuffled word tokens to form the correct sentence.
{
  "tokensAll": [{"id":"t1","t":"word"}, ...],
  "answerTokenIds": ["t1","t2", ...],
  "settings": {"autoPunctuation": {"append": "."}}
}
- Split sentence into word tokens (no punctuation in token text)
- Add 1-2 plausible distractor words NOT in the answer
- answerTokenIds = correct order. Token IDs: "t1","t2",...

=== SENTENCE_CLOZE_BUILD ===
User fills in blanks by choosing the correct word.
{
  "promptKorean": "한국어 힌트",
  "parts": [{"type":"text","t":"I "},{"type":"slot","slotId":"s1"},{"type":"text","t":" happy"}],
  "choices": [{"id":"c1","t":"am"},{"id":"c2","t":"is"},{"id":"c3","t":"are"}],
  "answerBySlot": {"s1":"c1"}
}
- Remove 1-2 key words to create slots
- 2-3 choices per slot (correct + plausible distractors)
- Slot IDs: "s1","s2",... Choice IDs: "c1","c2",...

=== SPEAK_REPEAT ===
User listens and repeats the sentence aloud.
{
  "tts": {"text":"the sentence","locale":"en-US","rate":1.0,"pitch":1.0,"autoPlay":true},
  "check": {"required": [{"id":"r1","t":"keyword"}, ...]}
}
- Pick 2-4 important content words the user must pronounce
- Required IDs: "r1","r2",...

Respond with JSON: {"quizzes": [{"index":0,"data":{...}}, ...]}`;

    const userMessage = JSON.stringify(items);
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw);
    return parsed.quizzes ?? [];
  }

  parseResponse(rawText: string): AiResponse {
    try {
      const parsed = JSON.parse(rawText);
      return AiResponseSchema.parse(parsed);
    } catch (error) {
      this.logger.warn(`Failed to parse AI response as JSON: ${rawText}`);
      return {
        type: 'BATCH',
        messages: [
          {
            type: 'TEXT',
            content: rawText,
            translated: rawText,
          },
        ],
        payload: {},
      };
    }
  }
}
