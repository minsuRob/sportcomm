/**
 * 게시물 생성 이벤트
 *
 * 게시물이 생성되었을 때 발행되는 이벤트입니다.
 * 이벤트 소싱 패턴의 일부로, 후속 처리를 위해 사용됩니다.
 */

export class PostCreatedEvent {
  constructor(
    public readonly postId: string,
    public readonly authorId: string,
    public readonly teamId: string,
    public readonly type: string,
    public readonly title: string | null,
    public readonly content: string,
    public readonly mediaIds: string[],
    public readonly timestamp: Date = new Date(),
  ) {}

  /**
   * 이벤트를 JSON으로 직렬화
   */
  toJSON() {
    return {
      eventType: 'PostCreated',
      postId: this.postId,
      authorId: this.authorId,
      teamId: this.teamId,
      type: this.type,
      title: this.title,
      content: this.content,
      mediaIds: this.mediaIds,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * JSON에서 이벤트 복원
   */
  static fromJSON(data: any): PostCreatedEvent {
    return new PostCreatedEvent(
      data.postId,
      data.authorId,
      data.teamId,
      data.type,
      data.title,
      data.content,
      data.mediaIds,
      new Date(data.timestamp),
    );
  }
}
