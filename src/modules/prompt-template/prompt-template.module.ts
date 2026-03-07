import { Module } from '@nestjs/common';
import { PromptTemplateService } from './prompt-template.service';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PromptTemplateService],
  exports: [PromptTemplateService],
})
export class PromptTemplateModule {}
