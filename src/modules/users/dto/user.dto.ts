import { Level, UserRole } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  id: number;
  email: string;
  name: string | null;
  profileImage: string | null;
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
  xp: number;
  xpToNextLevel: number | null;
  dailyStatus: DailyStatusDto;
  selectedCharacter: SelectedCharacterDto | null;
}

export class RegisterProfileDto {
  name: string;
}

export class DailyStatusDto {
  quizCompleted: boolean;
}
