import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { FaceTalkService } from './facetalk.service';
import {
  FaceTalkSessionDto,
  FaceTalkTurnDto,
  FaceTalkTurnResponseDto,
  StartFaceTalkDto,
  StartFaceTalkResponseDto,
} from './dto/facetalk.dto';

@Controller('facetalk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FaceTalkController {
  constructor(private readonly faceTalkService: FaceTalkService) {}

  @Post()
  @ApiOkResponse({ type: StartFaceTalkResponseDto })
  async startSession(
    @ReqUser('id') userId: number,
    @Body() dto: StartFaceTalkDto
  ): Promise<StartFaceTalkResponseDto> {
    return this.faceTalkService.startSession(dto.chatId, userId);
  }

  @Get(':sessionId')
  @ApiOkResponse({ type: FaceTalkSessionDto })
  async getSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<FaceTalkSessionDto> {
    return this.faceTalkService.getSession(sessionId, userId);
  }

  @Post(':sessionId/end')
  @ApiOkResponse({ type: FaceTalkSessionDto })
  async endSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<FaceTalkSessionDto> {
    return this.faceTalkService.endSession(sessionId, userId);
  }

  @Post(':sessionId/disconnect')
  @ApiOkResponse({ type: FaceTalkSessionDto })
  async disconnectSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<FaceTalkSessionDto> {
    return this.faceTalkService.disconnectSession(sessionId, userId);
  }

  @Post(':sessionId/missed')
  @ApiOkResponse({ type: FaceTalkSessionDto })
  async missedSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<FaceTalkSessionDto> {
    return this.faceTalkService.missedSession(sessionId, userId);
  }

  @Post(':sessionId/turns')
  @ApiOkResponse({ type: FaceTalkTurnResponseDto })
  async processTurn(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: FaceTalkTurnDto
  ): Promise<FaceTalkTurnResponseDto> {
    return this.faceTalkService.processTurn(sessionId, userId, dto.userInput);
  }
}
