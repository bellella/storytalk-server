import { IsEmail, IsInt } from 'class-validator';
import { IsString } from 'class-validator';
import { IsNotEmpty } from 'class-validator';

export class UpdatePersonalInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  selectedCharacterId: number;
}
