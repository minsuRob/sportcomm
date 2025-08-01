import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from '../../entities/bookmark.entity';
import { Post } from '../../entities/post.entity';

/**
 * 북마크 서비스
 *
 * 북마크 관련 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  /**
   * 북마크 토글 기능
   * 이미 북마크되어 있으면 제거하고, 없으면 추가합니다.
   *
   * @param userId 사용자 ID
   * @param postId 게시물 ID
   * @returns 북마크 추가 시 true, 제거 시 false
   */
  async toggleBookmark(userId: string, postId: string): Promise<boolean> {
    // 게시물 존재 여부 확인
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // 기존 북마크 확인
    const existingBookmark = await this.bookmarkRepository.findOne({
      where: { userId, postId },
    });

    if (existingBookmark) {
      // 북마크가 존재하면 제거
      await this.bookmarkRepository.remove(existingBookmark);
      return false; // 북마크 제거됨
    } else {
      // 북마크가 없으면 추가
      const newBookmark = this.bookmarkRepository.create({
        userId,
        postId,
      });
      await this.bookmarkRepository.save(newBookmark);
      return true; // 북마크 추가됨
    }
  }

  /**
   * 사용자의 북마크 목록 조회
   *
   * @param userId 사용자 ID
   * @returns 북마크된 게시물 목록
   */
  async getUserBookmarks(userId: string): Promise<Post[]> {
    const bookmarks = await this.bookmarkRepository.find({
      where: { userId },
      relations: {
        post: {
          author: true,
          media: true,
          comments: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    return bookmarks.map((bookmark) => bookmark.post);
  }

  /**
   * 특정 게시물이 사용자에 의해 북마크되었는지 확인
   *
   * @param userId 사용자 ID
   * @param postId 게시물 ID
   * @returns 북마크되어 있으면 true, 아니면 false
   */
  async isBookmarkedByUser(userId: string, postId: string): Promise<boolean> {
    if (!userId || !postId) return false;

    const bookmark = await this.bookmarkRepository.findOne({
      where: { userId, postId },
    });

    return !!bookmark;
  }

  /**
   * 게시물의 총 북마크 수 조회
   *
   * @param postId 게시물 ID
   * @returns 북마크 수
   */
  async getBookmarkCount(postId: string): Promise<number> {
    return await this.bookmarkRepository.count({
      where: { postId },
    });
  }

  /**
   * 사용자의 총 북마크 수 조회
   *
   * @param userId 사용자 ID
   * @returns 북마크 수
   */
  async getUserBookmarkCount(userId: string): Promise<number> {
    return await this.bookmarkRepository.count({
      where: { userId },
    });
  }

  /**
   * 북마크 삭제 (관리자용)
   *
   * @param bookmarkId 북마크 ID
   * @returns 삭제 성공 여부
   */
  async deleteBookmark(bookmarkId: string): Promise<boolean> {
    const result = await this.bookmarkRepository.delete(bookmarkId);
    return (result.affected || 0) > 0;
  }

  /**
   * 사용자의 모든 북마크 삭제
   *
   * @param userId 사용자 ID
   * @returns 삭제된 북마크 수
   */
  async deleteAllUserBookmarks(userId: string): Promise<number> {
    const result = await this.bookmarkRepository.delete({ userId });
    return result.affected || 0;
  }

  /**
   * 게시물의 모든 북마크 삭제 (게시물 삭제 시 사용)
   *
   * @param postId 게시물 ID
   * @returns 삭제된 북마크 수
   */
  async deleteAllPostBookmarks(postId: string): Promise<number> {
    const result = await this.bookmarkRepository.delete({ postId });
    return result.affected || 0;
  }
}
