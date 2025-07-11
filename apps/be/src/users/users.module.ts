import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

/**
 * @description 사용자 관련 기능을 담당하는 모듈입니다.
 * @summary TypeORM을 통해 User 엔티티를 주입하고, UsersResolver와 UsersService를 프로바이더로 등록합니다.
 * UsersService는 다른 모듈(예: AuthModule)에서도 사용할 수 있도록 export합니다.
 */
@Module({
  imports: [
    // TypeOrmModule.forFeature()를 사용하여 이 모듈에서 사용할 리포지토리를 등록합니다.
    // 이렇게 하면 UsersService에서 @InjectRepository(User)를 사용하여 User 리포지토리를 주입받을 수 있습니다.
    TypeOrmModule.forFeature([User]),
  ],
  // 프로바이더 배열에 리졸버와 서비스를 등록합니다.
  // NestJS의 DI(의존성 주입) 컨테이너가 이들의 인스턴스를 관리하게 됩니다.
  providers: [UsersResolver, UsersService],
  // UsersService를 다른 모듈에서 주입하여 사용할 수 있도록 export합니다.
  // 예를 들어, AuthModule에서 사용자의 유효성을 검사할 때 UsersService가 필요합니다.
  exports: [UsersService],
})
export class UsersModule {}
