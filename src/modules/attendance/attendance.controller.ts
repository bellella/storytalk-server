import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { CheckInResponseDto } from './dto/attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @ApiOperation({ summary: '출석 체크 (리워드 지급)' })
  @ApiResponse({ type: CheckInResponseDto })
  async checkIn(@ReqUser('id') userId: number): Promise<CheckInResponseDto> {
    return this.attendanceService.checkIn(userId);
  }

  @Get('monthly')
  @ApiOperation({ summary: '이번 달 출석 목록' })
  @ApiQuery({ name: 'year', type: Number, required: false })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiResponse({ type: [String], description: '출석한 날짜 배열 (YYYY-MM-DD)' })
  async getMonthly(
    @ReqUser('id') userId: number,
    @Query('year') year: number,
    @Query('month') month: number
  ): Promise<string[]> {
    return this.attendanceService.getMonthlyAttendance(userId, year, month);
  }
}
