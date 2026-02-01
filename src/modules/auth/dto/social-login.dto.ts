import { UserDto } from '@/modules/users/dto/user.dto';

export class SocialLoginResponseDto {
  user: UserDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNew: boolean;
}
