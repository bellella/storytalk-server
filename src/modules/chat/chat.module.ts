import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from '../ai/ai.module';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [AiModule, JwtModule, PromptTemplateModule, UsageModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
