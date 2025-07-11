import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media, UploadStatus } from './media.entity';
import { PostsService } from '../posts/posts.service';
import { CreateMediaInput } from './dto/create-media.input';
import { UpdateMediaStatusInput } from './dto/update-media-status.input';

/**
 * @description 미디어 파일과 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * @summary 데이터베이스와의 상호작용(생성, 상태 업데이트, 조회, 삭제)을 담당하며, MediaResolver에 의해 호출됩니다.
 */
@Injectable()
export class MediaService {
  /**
   * @param mediaRepository TypeORM의 Media 리포지토리.
   * @param postsService 게시물의 존재 및 소유권 확인을 위한 PostsService.
   */
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly postsService: PostsService,
  ) {}

  /**
   * @description 새로운 미디어 레코드를 생성합니다. (파일 업로드 시작 시 호출)
   * @summary 파일 업로드를 시작하기 전에 데이터베이스에 미디어 정보를 미리 생성합니다.
   * 상태는 'UPLOADING'으로 초기화됩니다. 이 단계에서는 미디어를 첨부할 게시물이 존재하고,
   * 요청을 보낸 사용자가 해당 게시물의 소유자인지 확인합니다.
   * @param authorId - 요청을 보낸 사용자의 ID.
   * @param createMediaInput - 미디어 생성을 위한 데이터 (postId, type).
   * @returns 생성된 미디어 객체. 클라이언트는 이 객체의 ID를 사용하여 나중에 상태를 업데이트합니다.
   * @throws {ForbiddenException} - 게시물 작성자가 아닌 다른 사용자가 미디어 생성을 시도할 경우 발생합니다.
   */
  async create(
    authorId: string,
    createMediaInput: CreateMediaInput,
  ): Promise<Media> {
    const { postId, type } = createMediaInput;

    // 1. 미디어를 첨부할 게시물이 존재하는지, 그리고 요청한 사용자가 작성자인지 확인합니다.
    const post = await this.postsService.findOne(postId);
    if (post.authorId !== authorId) {
      throw new ForbiddenException('게시물의 작성자만 미디어를 추가할 수 있습니다.');
    }

    // 2. 새로운 미디어 엔티티를 생성합니다.
    const newMedia = this.mediaRepository.create({
      postId,
      type,
      url: '', // URL은 업로드 완료 후 업데이트되므로 처음엔 비워둡니다.
      status: UploadStatus.UPLOADING, // 상태를 'UPLOADING'으로 설정합니다.
    });

    // 3. 데이터베이스에 저장하고 결과를 반환합니다.
    return this.mediaRepository.save(newMedia);
  }

  /**
   * @description 미디어 파일의 업로드 상태와 URL을 업데이트합니다. (파일 업로드 완료/실패 시 호출)
   * @param authorId - 요청을 보낸 사용자의 ID.
   * @param updateMediaStatusInput - 상태 업데이트를 위한 데이터 (id, status, url).
   * @returns 업데이트된 미디어 객체.
   * @throws {NotFoundException} - 미디어 레코드를 찾을 수 없을 경우 발생합니다.
   * @throws {ForbiddenException} - 권한이 없는 사용자가 상태 업데이트를 시도할 경우 발생합니다.
   */
  async updateStatus(
    authorId: string,
    updateMediaStatusInput: UpdateMediaStatusInput,
  ): Promise<Media> {
    const { id, status, url } = updateMediaStatusInput;

    // 'relations' 옵션을 사용하여 연관된 게시물 정보까지 함께 로드합니다.
    const media = await this.mediaRepository.findOne({
      where: { id },
      relations: ['post'],
    });

    if (!media) {
      throw new NotFoundException(`ID가 "${id}"인 미디어를 찾을 수 없습니다.`);
    }

    // 미디어가 속한 게시물의 작성자와 요청자가 동일한지 확인하여 권한을 검사합니다.
    if (media.post.authorId !== authorId) {
      throw new ForbiddenException('미디어 상태를 업데이트할 권한이 없습니다.');
    }

    media.status = status;
    // 업로드가 성공적으로 완료된 경우에만 URL을 업데이트합니다.
    if (status === UploadStatus.COMPLETED && url) {
      media.url = url;
    }

    return this.mediaRepository.save(media);
  }

  /**
   * @description 특정 미디어를 삭제합니다. (소프트 삭제)
   * @param authorId - 요청을 보낸 사용자의 ID.
   * @param id - 삭제할 미디어의 ID.
   * @returns 삭제된 미디어 객체 (soft-deleted).
   * @throws {NotFoundException} - 삭제할 미디어를 찾을 수 없을 경우 발생합니다.
   * @throws {ForbiddenException} - 권한이 없는 사용자가 삭제를 시도할 경우 발생합니다.
   */
  async remove(authorId: string, id: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({
      where: { id },
      relations: ['post'],
    });

    if (!media) {
      throw new NotFoundException(`ID가 "${id}"인 미디어를 찾을 수 없습니다.`);
    }

    if (media.post.authorId !== authorId) {
      throw new ForbiddenException('미디어를 삭제할 권한이 없습니다.');
    }

    await this.mediaRepository.softRemove(media);
    return media;
  }
}
