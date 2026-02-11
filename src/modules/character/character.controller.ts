import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CharacterService } from './character.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { ReqUser } from '@/common/decorators/user.decorator';
import { CharacterDetailDto, CharacterListItemDto } from './dto/character.dto';

@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get()
  @ApiOkResponse({ type: [CharacterListItemDto] })
  async getCharacters(
    @ReqUser('id') userId: number
  ): Promise<CharacterListItemDto[]> {
    return this.characterService.getCharacters(userId);
  }

  @Get(':characterId')
  @ApiOkResponse({ type: CharacterDetailDto })
  async getCharacter(
    @ReqUser('id') userId: number,
    @Param('characterId', ParseIntPipe) characterId: number
  ): Promise<CharacterDetailDto> {
    return this.characterService.getCharacter(userId, characterId);
  }
}
