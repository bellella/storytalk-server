export class UserDto {
  id: number;
  email: string;
  name: string | null;
  profileImage: string | null;
}

export class UserProfileDto extends UserDto {
  level: number;
  exp: number;
  streakDays: number;
}

export class RegisterProfileDto {
  name: string;
}
