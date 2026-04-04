import { Level, Gender, UserRole } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { XpDto } from '../../xp/dto/xp-progress.dto';

export class UserDto {
  id: number;
  email: string;
  name: string | null;
  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender: Gender | null;
  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;
}

export class SelectedCharacterDto {
  id: number;
  avatarImage: string | null;
}

export class UserProfileDto extends UserDto {
  level: Level;

  @ApiProperty({ type: XpDto })
  xp: XpDto;

  dailyStatus: DailyStatusDto;
  selectedCharacter: SelectedCharacterDto | null;
}

export class RegisterProfileDto {
  name: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender: Gender;
}

export class DailyStatusDto {
  quizCompleted: boolean;

  @ApiProperty({ description: '오늘 출석 체크 완료 여부' })
  attendanceChecked: boolean;
}
