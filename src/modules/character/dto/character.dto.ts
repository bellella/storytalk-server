import { Gender } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CharacterListItemDto {
  id: number;
  name: string;
  avatarImage: string;
}

export class SelectableCharacterDto {
  id: number;
  name: string;
  avatarImage: string | null;
  minUserLevel: number;
  isSelected: boolean;
}

export class CharacterDetailDto {
  id: number;
  name: string;
  avatarImage: string;
  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender: Gender | null;
  mainImage: string;
  description: string;
  personality: string;
  affinity?: number;
  followers?: number;
}
