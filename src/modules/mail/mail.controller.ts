import { Body, Controller, Post } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendMailDto } from './dto/send-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('send-html')
  async sendHtml(@Body() dto: SendMailDto) {
    await this.mailerService.sendMail({
      to: dto.to,
      subject: dto.subject,
      template: './test',
      context: {
        content: dto.content,
      },
    });
    return { message: 'HTML email sent successfully' };
  }
}
