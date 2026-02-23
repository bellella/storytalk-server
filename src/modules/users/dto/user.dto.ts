import { Level } from '@/generated/prisma/enums';

export class UserDto {
  id: number;
  email: string;
  name: string | null;
  profileImage: string | null;
}

export class SelectedCharacterDto {
  id: number;
  avatarImage: string | null;
}

export class UserProfileDto extends UserDto {
  level: Level;
  xpLevel: number;
  xp: number;
  streakDays: number;
  dailyStatus: DailyStatusDto;
  selectedCharacter: SelectedCharacterDto | null;
}

export class RegisterProfileDto {
  name: string;
}

export class DailyStatusDto {
  quizCompleted: boolean;
}
