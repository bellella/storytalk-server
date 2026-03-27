import { UserGender } from '@/generated/prisma/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePersonalInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  selectedCharacterId: number;

  @ApiPropertyOptional({ enum: UserGender, enumName: 'UserGender' })
  @IsEnum(UserGender)
  gender: UserGender;
}
