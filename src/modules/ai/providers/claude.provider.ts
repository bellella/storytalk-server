import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiMessage, AiProvider } from '../ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async callApi(systemPrompt: string, messages?: AiMessage[]): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: (messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }
}
