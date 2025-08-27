import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MaxLength, IsDateString, IsInt } from 'class-validator';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { TeamsService } from './teams.service';

/**
 * 팀 로고 업데이트 입력 타입
 */
@InputType()
export class UpdateTeamLogoInput {
  @Field(() => String, { description: '팀 ID' })
  @IsString({ message: '팀 ID는 문자열이어야 합니다.' })
  teamId: string;

  @Field(() => String, { description: '팀 로고 이미지 URL' })
  @IsString({ message: '로고 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '로고 URL은 최대 500자까지 가능합니다.' })
  logoUrl: string;
}

/**
 * 사용자 팀 선택 업데이트 입력 타입
 */
@InputType()
export class UpdateMyTeamInput {
  @Field(() => String, { description: '팀 ID' })
  @IsString()
  teamId: string;

  @Field(() => String, {
    nullable: true,
    description: '팬이 된 날짜 (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  favoriteDate?: string;

  @Field(() => String, {
    nullable: true,
    description: '최애 선수 이름 (선택)',
  })
  @IsOptional()
  @MaxLength(50)
  favoritePlayerName?: string;

  @Field(() => Number, {
    nullable: true,
    description: '최애 선수 등번호 (선택)',
  })
  @IsOptional()
  @IsInt()
  favoritePlayerNumber?: number;
}

/**
 * 팀 관련 뮤테이션 리졸버
 */
@Resolver(() => Team)
export class TeamsMutationResolver {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * 팀 로고 업데이트 (관리자 전용)
   * @param user 현재 사용자
   * @param input 업데이트 입력 데이터
   * @returns 업데이트된 팀 정보
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Team, { description: '팀 로고 업데이트 (관리자 전용)' })
  async updateTeamLogo(
    @CurrentUser() user: User,
    @Args('input') input: UpdateTeamLogoInput,
  ): Promise<Team> {
    // 관리자 권한 확인
    if (user.role !== 'ADMIN') {
      throw new Error('관리자만 팀 로고를 업데이트할 수 있습니다.');
    }

    return await this.teamsService.updateTeamLogo(input.teamId, input.logoUrl);
  }
}
