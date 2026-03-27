import { ReqUser } from '@/common/decorators/user.decorator';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';
import {
  SupportInquiryItemDto,
  SupportInquiryListDto,
} from './dto/support-inquiry.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('inquiries')
  @ApiCreatedResponse({ type: SupportInquiryItemDto })
  createInquiry(
    @ReqUser('id') userId: number,
    @Body() dto: CreateSupportInquiryDto
  ): Promise<SupportInquiryItemDto> {
    return this.supportService.createInquiry(userId, dto);
  }

  @Get('inquiries/me')
  @ApiOkResponse({ type: SupportInquiryListDto })
  listMyInquiries(
    @ReqUser('id') userId: number
  ): Promise<SupportInquiryListDto> {
    return this.supportService.listMyInquiries(userId);
  }
}
