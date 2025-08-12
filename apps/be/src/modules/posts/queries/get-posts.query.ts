/**
 * 게시물 목록 조회 Query
 *
 * CQRS 패턴에서 읽기 작업을 담당하는 쿼리입니다.
 */

export class GetPostsQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly type?: string,
    public readonly teamId?: string,
    public readonly authorId?: string,
    public readonly sortBy:
      | 'createdAt'
      | 'likeCount'
      | 'viewCount' = 'createdAt',
    public readonly sortOrder: 'ASC' | 'DESC' = 'DESC',
    public readonly includeMedia: boolean = true,
    public readonly includeAuthor: boolean = true,
  ) {}
}
