import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Prisma $queryRaw을 사용하여 간단한 쿼리를 실행하여 DB 연결 확인
      await this.prisma.$queryRaw`SELECT 1`; 
      return this.getStatus(key, true);
    } catch (e) {
      // 연결 실패 시 HealthCheckError 발생
      throw new HealthCheckError('Prisma check failed', this.getStatus(key, false));
    }
  }
}