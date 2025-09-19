import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * 모든 엔티티의 기본 필드를 정의하는 베이스 엔티티 클래스
 *
 * 모든 엔티티는 이 클래스를 상속받아 공통 필드를 자동으로 포함합니다.
 * - UUID 기반 Primary Key
 * - 생성/수정/삭제 시간 자동 관리
 * - Soft Delete 지원
 */
@ObjectType({ isAbstract: true })
export abstract class BaseEntity {
  /**
   * 엔티티의 고유 식별자 (UUID)
   * 자동 생성되며 변경할 수 없습니다.
   */
  @Field(() => ID, { description: '고유 식별자' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 엔티티 생성 시간 (UTC)
   * 레코드가 처음 생성될 때 자동으로 설정됩니다.
   * 항상 UTC로 저장되어 시간대 문제를 방지합니다.
   */
  @Field({ description: '생성 일시 (UTC)' })
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
    comment: '생성일시 (UTC)',
  })
  createdAt: Date;

  /**
   * 엔티티 최종 수정 시간 (UTC)
   * 레코드가 업데이트될 때마다 자동으로 갱신됩니다.
   * 항상 UTC로 저장되어 시간대 문제를 방지합니다.
   */
  @Field({ description: '수정 일시 (UTC)' })
  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
    onUpdate: 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
    comment: '수정일시 (UTC)',
  })
  updatedAt: Date;

  /**
   * 엔티티 소프트 삭제 시간
   * 실제 삭제가 아닌 논리적 삭제를 위해 사용됩니다.
   * null인 경우 활성 상태, 값이 있는 경우 삭제된 상태입니다.
   */
  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
    comment: '삭제일시 (소프트 삭제)',
  })
  deletedAt?: Date;

  /**
   * 엔티티가 삭제되었는지 확인하는 헬퍼 메서드
   * @returns 삭제된 경우 true, 활성 상태인 경우 false
   */
  get isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * 엔티티가 활성 상태인지 확인하는 헬퍼 메서드
   * @returns 활성 상태인 경우 true, 삭제된 경우 false
   */
  get isEntityActive(): boolean {
    return !this.isDeleted;
  }
}
