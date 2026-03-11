import { MessageType } from '@/generated/prisma/enums';
import { SendMessageOptionType } from '@/modules/chat/dto/send-message.dto';

export interface CharacterContext {
  name: string;
  description: string;
  personality?: string | null;
  aiPrompt?: string | null;
}

export interface MessageContext {
  isFromUser: boolean;
  content: string;
}

export interface AiMessageContext {
  type: MessageType;
  content: string;
  translated: string;
}

export class GenerateCharacterResponseOptions {
  type: MessageType;
  userId: number;
  userName: string | null;
  aiPrompt: string;
  affinity: number;
  recentMessages: MessageContext[];
  userMessage: string;
  options?: SendMessageOptionType[];
  summary?: string | null;
  /** PromptTemplate에서 가져온 시스템 프롬프트 (있으면 buildSystemPrompt 대신 사용) */
  systemPrompt?: string;
}

export class BuildSystemPromptData {
  type: MessageType;
  aiPrompt: string;
  affinity: number;
  userName: string | null;
  options?: SendMessageOptionType[];
  summary?: string | null;
}

export interface SaveMessageData {
  chatId: number;
  userId: number;
  characterId: number;
  isFromUser: boolean;
  type: MessageType;
  content: string;
  options?: SendMessageOptionType[];
  payload?: Record<string, any>;
}
