import { Module } from '@nestjs/common';
import { AiService } from './openai.service';
import { AI_PROVIDER } from './ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  providers: [{ provide: AI_PROVIDER, useClass: GeminiProvider }, AiService],
  exports: [AiService],
})
export class AiModule {}
