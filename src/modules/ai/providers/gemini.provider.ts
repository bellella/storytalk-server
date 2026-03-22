import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AiMessage, AiProvider } from '../ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
  }

  async callApi(systemPrompt: string, messages?: AiMessage[]): Promise<string> {
    const msgs = messages ?? [];
    const history = msgs.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = msgs.at(-1)?.content ?? '';

    const chat = this.client.chats.create({
      model: 'gemini-3.1-flash-lite-preview',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
      history,
    });

    const response = await chat.sendMessage({ message: lastMessage });
    return response.text ?? '';
  }
}
