import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Media } from './media.entity';
import { MediaService } from './media.service';
import { CreateMediaInput } from './dto/create-media.input';
import { UpdateMediaStatusInput } from './dto/update-media-status.input';

/**
 * @description 미디어 파일과 관련된 GraphQL 요청(뮤테이션)을 처리하는 리졸버입니다.
 * @summary `@Resolver()` 데코레이터에 `Media` 엔티티를 전달하여 이 리졸버가 `Media` 타입을 처리함을 명시합니다.
 * 모든 요청은 `JwtAuthGuard`를 통해 인증된 사용자만 접근할 수 있도록 보호됩니다.
 */
@Resolver(() => Media)
export class MediaResolver {
  /**
   * @param mediaService - 미디어 관련 비즈니스 로직을 담고 있는 서비스
   */
  constructor(private readonly mediaService: MediaService) {}

  /**
   * @description 새로운 미디어 레코드를 생성하는 뮤테이션입니다.
   * @summary 클라이언트가 파일 업로드를 시작하기 전에 호출하여 DB에 레코드를 생성하고,
   * 생성된 미디어 ID와 업로드에 필요한 정보(예: pre-signed URL)를 받아가는 용도로 사용될 수 있습니다.
   * @param user - `@CurrentUser()` 데코레이터를 통해 주입된 현재 사용자 정보.
   * @param createMediaInput - 미디어 생성을 위한 입력 데이터 (게시물 ID, 미디어 타입).
   * @returns 생성된 미디어 객체 (상태: UPLOADING).
   */
  @Mutation(() => Media, {
    description: '새로운 미디어 레코드를 생성합니다 (파일 업로드 시작).',
  })
  @UseGuards(JwtAuthGuard)
  createMedia(
    @CurrentUser() user: { id: string },
    @Args('createMediaInput') createMediaInput: CreateMediaInput,
  ): Promise<Media> {
    return this.mediaService.create(user.id, createMediaInput);
  }

  /**
   * @description 미디어의 상태와 URL을 업데이트하는 뮤테이션입니다.
   * @summary 파일 업로드가 완료되거나 실패했을 때 호출하여 DB 레코드의 상태를 변경합니다.
   * @param user - 현재 사용자 정보.
   * @param updateMediaStatusInput - 상태 업데이트를 위한 입력 데이터 (미디어 ID, 상태, URL).
   * @returns 업데이트된 미디어 객체.
   */
  @Mutation(() => Media, {
    description:
      '미디어의 업로드 상태와 URL을 업데이트합니다 (파일 업로드 완료/실패).',
  })
  @UseGuards(JwtAuthGuard)
  updateMediaStatus(
    @CurrentUser() user: { id: string },
    @Args('updateMediaStatusInput')
    updateMediaStatusInput: UpdateMediaStatusInput,
  ): Promise<Media> {
    return this.mediaService.updateStatus(user.id, updateMediaStatusInput);
  }

  /**
   * @description 특정 미디어를 삭제하는 뮤테이션입니다.
   * @summary 게시물에서 첨부된 미디어를 제거할 때 사용합니다.
   * @param user - 현재 사용자 정보.
   * @param id - 삭제할 미디어의 ID.
   * @returns 소프트 삭제 처리된 미디어 객체.
   */
  @Mutation(() => Media, {
    description: '미디어를 삭제합니다 (소프트 삭제).',
  })
  @UseGuards(JwtAuthGuard)
  removeMedia(
    @CurrentUser() user: { id: string },
    @Args('id', { type: () => String, description: '삭제할 미디어의 ID' })
    id: string,
  ): Promise<Media> {
    return this.mediaService.remove(user.id, id);
  }
}
