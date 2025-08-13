/**
 * 기본 Repository 인터페이스
 *
 * 모든 Repository가 구현해야 하는 기본 CRUD 작업을 정의합니다.
 * 의존성 주입과 테스트 용이성을 위한 인터페이스 기반 설계입니다.
 */

export interface BaseRepositoryInterface<T> {
  /**
   * 엔티티 생성
   */
  create(entity: Partial<T>): Promise<T>;

  /**
   * ID로 엔티티 조회
   */
  findById(id: string): Promise<T | null>;

  /**
   * 모든 엔티티 조회 (페이지네이션 포함)
   */
  findAll(options?: {
    page?: number;
    limit?: number;
    where?: any;
    order?: any;
  }): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 조건에 맞는 엔티티 조회
   */
  findOne(where: any): Promise<T | null>;

  /**
   * 조건에 맞는 여러 엔티티 조회
   */
  findMany(
    where: any,
    options?: {
      limit?: number;
      order?: any;
    },
  ): Promise<T[]>;

  /**
   * 엔티티 업데이트
   */
  update(id: string, updates: Partial<T>): Promise<T>;

  /**
   * 엔티티 삭제
   */
  delete(id: string): Promise<boolean>;

  /**
   * 엔티티 존재 여부 확인
   */
  exists(where: any): Promise<boolean>;

  /**
   * 개수 조회
   */
  count(where?: any): Promise<number>;
}
