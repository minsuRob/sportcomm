import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './follow.entity';
import { FollowsResolver } from './follows.resolver';
import { FollowsService } from './follows.service';
import { UsersModule } from '../users/users.module';

/**
 * @description 팔로우/언팔로우 관련 기능을 담당하는 모듈입니다.
 * @summary TypeORM을 통해 Follow 엔티티를 주입하고, FollowsResolver와 FollowsService를 프로바이더로 등록합니다.
 * 사용자의 존재 여부 확인을 위해 UsersModule을 임포트합니다.
 */
@Module({
  imports: [
    // 이 모듈에서 사용할 Follow 리포지토리를 등록합니다.
    TypeOrmModule.forFeature([Follow]),
    // 팔로우할 사용자가 실제로 존재하는지 확인하기 위해 UsersModule을 임포트합니다.
    // 이를 통해 UsersService를 FollowsService에 주입할 수 있습니다.
    UsersModule,
  ],
  // 리졸버와 서비스를 프로바이더로 등록합니다.
  providers: [FollowsResolver, FollowsService],
})
export class FollowsModule {}
