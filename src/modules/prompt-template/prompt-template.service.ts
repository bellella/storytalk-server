import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

/**
 * PromptTemplate에서 key로 템플릿을 조회하고,
 * {{variableName}} 형태의 플레이스홀더를 variables로 치환하여 반환.
 */
@Injectable()
export class PromptTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * key로 템플릿 조회 후 variables로 {{varName}} 치환하여 반환.
   * @param key PromptTemplate.key (unique)
   * @param variables {{varName}} → variables.varName 치환
   */
  async getPromptContent(
    key: string,
    variables?: Record<string, string | number | boolean | undefined>
  ): Promise<string> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { key, isActive: true },
      select: { content: true },
    });

    if (!template) {
      throw new NotFoundException(`PromptTemplate not found: key="${key}"`);
    }

    return this.parseVariables(template.content, variables);
  }

  /**
   * 템플릿이 있으면 치환된 content 반환, 없으면 null.
   */
  async getPromptContentOrNull(
    key: string,
    variables?: Record<string, string | number | boolean | undefined>
  ): Promise<string | null> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { key, isActive: true },
      select: { content: true },
    });

    if (!template) return null;
    return this.parseVariables(template.content, variables);
  }

  /**
   * content 내 {{varName}}을 variables[varName]으로 치환.
   */
  private parseVariables(
    content: string,
    variables?: Record<string, string | number | boolean | undefined>
  ): string {
    if (!variables) return content;

    return content.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      const value = variables[varName];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }
}
