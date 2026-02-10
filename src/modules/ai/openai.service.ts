import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiResponse, AiResponseSchema } from './ai-response.schema';

interface CharacterContext {
  name: string;
  description: string;
  personality?: string | null;
  aiPrompt?: string | null;
}

interface MessageContext {
  isFromUser: boolean;
  content: string;
}

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
    character: CharacterContext,
    affinity: number,
    recentMessages: MessageContext[],
    userMessage: string,
  ): Promise<AiResponse> {
    const systemPrompt = this.buildSystemPrompt(character, affinity);
    const messages = this.buildMessageHistory(recentMessages, userMessage);
    const rawText = await this.callApi(systemPrompt, messages);
    return this.parseResponse(rawText);
  }

  buildSystemPrompt(character: CharacterContext, affinity: number): string {
    const parts = [
      `You are ${character.name}, a character in a language learning app.`,
      `\nCharacter Description: ${character.description}`,
      `Personality: ${character.personality || 'friendly and helpful'}`,
      `Friendship Level (0-100): ${affinity}`,
    ];

    if (character.aiPrompt) {
      parts.push(`\nAdditional Instructions:\n${character.aiPrompt}`);
    }

    parts.push(`
Your goal is to help users practice English while staying in character.
Adjust your tone based on the friendship level (higher = more casual and warm).

You MUST respond in the following JSON format:
{
  "type": "CHAT" | "GRAMMAR_CORRECTION" | "TRANSLATION",
  "message": "your response message",
  "data": {}
}

- If the user makes a grammar mistake, respond with type "GRAMMAR_CORRECTION" and include { "original": "...", "corrected": "..." } in data.
- If the user asks for translation, respond with type "TRANSLATION" and include { "original": "...", "translated": "..." } in data.
- Otherwise, respond with type "CHAT".`);

    return parts.join('\n');
  }

  buildMessageHistory(
    recentMessages: MessageContext[],
    userMessage: string,
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

  async callApi(
    systemPrompt: string,
    messages: ChatCompletionMessageParam[],
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
        type: 'CHAT',
        message: rawText,
        data: {},
      };
    }
  }
}
