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
  aiPrompt: string;
  affinity: number;
  recentMessages: MessageContext[];
  userMessage: string;
  options?: SendMessageOptionType[];
}

export class BuildSystemPromptData {
  type: MessageType;
  aiPrompt: string;
  affinity: number;
  options?: SendMessageOptionType[];
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
