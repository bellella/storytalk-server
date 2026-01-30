// src/modules/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      // 1. ConfigService를 주입받기 위해 useFactory 설정
      useFactory: (configService: ConfigService) => ({
        transport: { // SMTP 서버 설정
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT'),
          secure: configService.get('NODE_ENV') === 'production', // 프로덕션에서는 TLS 사용
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        // 2. 템플릿 엔진 설정 (Handlebars)
        template: {
          dir: join(process.cwd(), 'src/modules/mail/templates'), // 템플릿 경로 설정
          adapter: null, // HTML 템플릿 사용을 위한 설정 (Handlebars 등 필요 시 추가)
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [/* MailService */],
  exports: [/* MailService */],
})
export class MailModule {}