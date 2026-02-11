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
    const systemPrompt = this.buildSystemPrompt({
      type: options.type,
      aiPrompt: options.aiPrompt,
      affinity: options.affinity,
      options: options.options,
    });
    console.log(systemPrompt, '보내는시스템프롬프트');
    const messages = this.buildMessageHistory(
      options.recentMessages,
      options.userMessage
    );
    const rawText = await this.callApi(systemPrompt, messages);
    console.log(rawText, '챗지피티가 한것');
    return this.parseResponse(rawText);
  }

  buildSystemPrompt(data: BuildSystemPromptData): string {
    const { aiPrompt = '', affinity, options } = data;

    const parts = [
      `Instructions: ${aiPrompt}`,
      `Friendship Level (0-100): ${affinity}`,
    ];

    parts.push(`
      Your goal is to have a real conversation with the user.
      Adjust your tone based on the friendship level (higher = more casual and warm).
      You MUST respond in the following JSON format:
      {
        "type": "BATCH"
        "messages": [
        {"type": "TEXT", "content": "Response message to the user's message", 
        "translated": "translate your message to Korean"}, 
        {"type": "STICKER", "content": "cat-happy | cat-sad"}],
        "payload": {
          ${options?.includes(SendMessageOptionType.NEED_TRANSLATION) ? `"translated": "translate user's message to English",` : ''}
          ${options?.includes(SendMessageOptionType.NEED_GRAMMAR_CORRECTION) ? `"corrected": "correct the grammar of the user's message",` : ''}
        }
      }
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
    messages: ChatCompletionMessageParam[]
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    return completion.choices[0].message.content || '';
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
