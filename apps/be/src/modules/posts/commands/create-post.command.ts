/**
 * 게시물 생성 Command
 *
 * CQRS 패턴에서 상태를 변경하는 작업을 담당합니다.
 * 게시물 생성에 필요한 모든 데이터를 포함합니다.
 */

export class CreatePostCommand {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly type: string,
    public readonly teamId: string,
    public readonly authorId: string,
    public readonly mediaIds?: string[],
  ) {}
}
