import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. 서버 메모리/CPU 등의 리소스 상태 체크
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
      
      // 2. Prisma DB 연결 상태 체크
      () => this.prismaIndicator.isHealthy('database'), 
    ]);
  }
}