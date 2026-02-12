export class CharacterListItemDto {
  id: number;
  name: string;
  avatarImage: string;
}

export class CharacterDetailDto {
  id: number;
  name: string;
  avatarImage: string;
  mainImage: string;
  description: string;
  personality: string;
  affinity?: number;
  followers?: number;
}
