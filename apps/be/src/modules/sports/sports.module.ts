import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport, Team, UserTeam, User } from '../../entities';
import { SportsService } from './sports.service';
import { SportsResolver } from './sports.resolver';
import { TeamsService } from './teams.service';
import { TeamsResolver } from './teams.resolver';
import { UserTeamResolver } from './user-team.resolver';
import { TeamsMutationResolver } from './teams.mutation';

/**
 * 스포츠 및 팀 관리 모듈
 *
 * 스포츠 카테고리와 팀 정보를 관리하고,
 * 사용자의 팀 선택 기능을 제공합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Sport, Team, UserTeam, User])],
  providers: [
    SportsService,
    SportsResolver,
    TeamsService,
    TeamsResolver,
    TeamsMutationResolver,
    UserTeamResolver,
  ],
  exports: [SportsService, TeamsService],
})
export class SportsModule {}
