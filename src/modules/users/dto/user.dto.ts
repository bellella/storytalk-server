import { Level } from '@/generated/prisma/enums';

export class UserDto {
  id: number;
  email: string;
  name: string | null;
  profileImage: string | null;
}

export class UserProfileDto extends UserDto {
  level: Level;
  xp: number;
  streakDays: number;
  dailyStatus: DailyStatusDto;
}

export class RegisterProfileDto {
  name: string;
}

export class DailyStatusDto {
  quizCompleted: boolean;
}
