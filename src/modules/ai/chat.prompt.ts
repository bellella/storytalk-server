import { SendMessageOptionType } from '../chat/dto/send-message.dto';
import { BuildSystemPromptData } from '@/types/ai.type';

/** PromptTemplate용 변수 객체 생성 (채팅 시스템 프롬프트) */
export function prepareChatPromptVariables(
  data: BuildSystemPromptData
): Record<string, string> {
  const { aiPrompt = '', affinity, userName, options } = data;

  const userNameLine = userName
    ? `The user's name is "${userName}". Use their name naturally in conversation when appropriate.`
    : 'The user has not set a display name.';

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

  return {
    aiPrompt,
    affinity: String(affinity),
    userNameLine,
    payloadFields: payloadFields || '',
  };
}
