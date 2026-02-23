import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CharacterService } from './character.service';
import { CharacterDetailDto, CharacterListItemDto, SelectableCharacterDto } from './dto/character.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '@/types/auth.type';
import { ReqUser } from '@/common/decorators/user.decorator';

@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get()
  @ApiOkResponse({ type: [CharacterListItemDto] })
  async findAll(): Promise<CharacterListItemDto[]> {
    return this.characterService.getCharacters();
  }

  @Get('selectable')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: [SelectableCharacterDto] })
  async getSelectableCharacters(
    @ReqUser() user: CurrentUser | undefined
  ): Promise<SelectableCharacterDto[]> {
    return this.characterService.getSelectableCharacters(user?.id);
  }

  @Get(':characterId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: CharacterDetailDto })
  async findOne(
    @Param('characterId', ParseIntPipe) characterId: number,
    @ReqUser() user: CurrentUser | undefined
  ): Promise<CharacterDetailDto> {
    return this.characterService.getCharacter(characterId, user?.id);
  }
}
