import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { NoticeService } from './notice.service';
import {
  NoticeItemDto,
  NoticeListResponseDto,
  NoticePopupResponseDto,
} from './dto/notice.dto';

@ApiTags('Notice')
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  @ApiOperation({ summary: '공지사항 목록 (커서 페이지네이션)' })
  @ApiOkResponse({ type: NoticeListResponseDto })
  listNotices(@Query() query: CursorRequestDto): Promise<NoticeListResponseDto> {
    return this.noticeService.listNotices(query);
  }

  @Get('popup')
  @ApiOperation({ summary: '앱 시작 팝업용 최신 공지 1건' })
  @ApiOkResponse({ type: NoticePopupResponseDto })
  async getLatestPopup(): Promise<NoticePopupResponseDto> {
    const notice = await this.noticeService.getLatestPopupNotice();
    return { notice };
  }
}
