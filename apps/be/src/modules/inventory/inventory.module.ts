import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryResolver } from './inventory.resolver';
import { UserItem } from '../../entities/user-item.entity';
import { User } from '../../entities/user.entity';
import { ProgressModule } from '../progress/progress.module';

/**
 * InventoryModule
 *
 * 기능:
 * - 사용자 인벤토리(UserItem) 조회/구매 관련 GraphQL, Service 제공
 * - ProgressModule 을 이용해 포인트 차감/환불 로직 연계
 *
 * 구성 요소:
 * - Entity: UserItem (user_items)
 * - Service: InventoryService (구매/업서트/캐시 동기화)
 * - Resolver: InventoryResolver (GraphQL Query/Mutation)
 *
 * 향후 확장:
 * - 아이템 사용 / 소비 / 적용 효과 처리 Mutation 추가
 * - 기간제 아이템 만료 처리 스케줄러 모듈 연계
 * - 관리자 전용 카탈로그 CRUD (현재는 정적 상수)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserItem, User]),
    ProgressModule, // 포인트 차감/환불 로직 사용
  ],
  providers: [InventoryService, InventoryResolver],
  exports: [InventoryService],
})
export class InventoryModule {}

/*
추가 작업(별도 커밋):
- AppModule imports 배열에 InventoryModule 추가 필요
*/
