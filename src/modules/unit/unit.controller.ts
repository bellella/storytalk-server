import {
  Controller,
  Param,
  ParseIntPipe,
  UseGuards,
  Get,
} from '@nestjs/common';
import { UnitService } from './unit.service';
import { UnitDetailDto, UnitListItemDto } from './dto/unit.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ReqUser } from '@/common/decorators/user.decorator';
import { CurrentUser } from '@/types/auth.type';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-auth.guard';

@Controller('units')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth('access-token')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @ApiOkResponse({ type: [UnitListItemDto] })
  async findAll() {
    return this.unitService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: UnitDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: CurrentUser | undefined
  ) {
    return this.unitService.findOne(id, user?.id);
  }
}
