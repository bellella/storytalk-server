export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export abstract class AiProvider {
  abstract callApi(
    systemPrompt: string,
    messages?: AiMessage[]
  ): Promise<string>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
