import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';
import { FaceTalkController } from './facetalk.controller';
import { FaceTalkService } from './facetalk.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [AiModule, PromptTemplateModule, ChatModule],
  controllers: [FaceTalkController],
  providers: [FaceTalkService],
})
export class FaceTalkModule {}
