import {
  BuildSystemPromptData,
  GenerateCharacterResponseOptions,
  MessageContext,
} from '@/types/ai.type';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SendMessageOptionType } from '../chat/dto/send-message.dto';
import { AiResponse, AiResponseSchema } from './ai-response.schema';
import { AI_PROVIDER, AiMessage, AiProvider } from './ai-provider.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  async generateCharacterResponse(
    options: GenerateCharacterResponseOptions
  ): Promise<AiResponse> {
    const systemPrompt =
      options.systemPrompt ??
      this.buildSystemPrompt({
        type: options.type,
        chatPrompt: options.chatPrompt,
        affinity: options.affinity,
        userName: options.userName,
        options: options.options,
        summary: options.summary,
      });
    const messages = this.buildMessageHistory(
      options.recentMessages,
      options.userMessage
    );
    const rawText = await this.callApi(systemPrompt, messages);
    return this.parseResponse(rawText);
  }

  buildSystemPrompt(data: BuildSystemPromptData): string {
    const { chatPrompt = '', affinity, userName, options, summary } = data;

    const parts = [
      `Instructions: ${chatPrompt}`,
      `Friendship Level (0-100): ${affinity}`,
      ...(summary ? [`Conversation summary: ${summary}`] : []),
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

  buildMessageHistory(
    recentMessages: MessageContext[],
    userMessage: string
  ): AiMessage[] {
    const history: AiMessage[] = recentMessages.slice(-20).map((msg) => ({
      role: msg.isFromUser ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));

    history.push({ role: 'user', content: userMessage });
    return history;
  }

  async callApi(systemPrompt: string, messages?: AiMessage[]): Promise<string> {
    return this.provider.callApi(systemPrompt, messages);
  }

  parseResponse(rawText: string): AiResponse {
    try {
      const parsed = JSON.parse(rawText);
      return AiResponseSchema.parse(parsed);
    } catch (error) {
      this.logger.error(`Failed to parse AI response as JSON. rawText: ${rawText}`);
      throw new Error('AI response parsing failed');
    }
  }
}

// 하위 호환을 위한 alias
export { AiService as OpenAiService };
