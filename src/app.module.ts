import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { FileModule } from './modules/files/file.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/user.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { StoryModule } from './modules/story/story.module';
import { EpisodeModule } from './modules/episode/episode.module';
import { AuthModule } from './modules/auth/auth.module';
import { UnitModule } from './modules/unit/unit.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { XpModule } from './modules/xp/xp.module';
import { AiModule } from './modules/ai/ai.module';
import { FriendModule } from './modules/friend/friend.module';
import { ChatModule } from './modules/chat/chat.module';
import { CharacterModule } from './modules/character/character.module';
import { PlayModule } from './modules/episode/play/play.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FileModule,
    PrismaModule,
    UsersModule,
    HealthModule,
    MailModule,
    StoryModule,
    EpisodeModule,
    PlayModule,
    UnitModule,
    QuizModule,
    XpModule,
    AiModule,
    FriendModule,
    ChatModule,
    CharacterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
