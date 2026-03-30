import { Level, UserGender, UserRole } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { XpDto } from '../../xp/dto/xp-progress.dto';

export class UserDto {
  id: number;
  email: string;
  name: string | null;
  @ApiProperty({ enum: UserGender, enumName: 'UserGender' })
  gender: UserGender | null;
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

  @ApiProperty({ enum: UserGender, enumName: 'UserGender' })
  gender: UserGender;
}

export class DailyStatusDto {
  quizCompleted: boolean;

  @ApiProperty({ description: '오늘 출석 체크 완료 여부' })
  attendanceChecked: boolean;
}
