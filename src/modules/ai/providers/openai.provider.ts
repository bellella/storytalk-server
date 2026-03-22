import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiMessage, AiProvider } from '../ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async callApi(systemPrompt: string, messages?: AiMessage[]): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages ?? []),
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || '';
  }
}
