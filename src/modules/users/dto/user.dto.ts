import { Level, UserGender, UserRole } from '@/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  xpLevel: number;

  @ApiProperty({
    description: '현재 레벨 구간에서 획득한 XP (진행바용, 누적 총합 아님)',
  })
  xpInCurrentLevel: number;

  @ApiPropertyOptional({
    description: '다음 레벨까지 더 필요한 XP (최고 레벨이면 null)',
  })
  xpToNextLevel: number | null;

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
