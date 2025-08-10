import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { Media } from '../../entities/media.entity';
import { Thumbnail, ThumbnailSize } from '../../entities/thumbnail.entity';
import { MediaService } from './media.service';

/**
 * 미디어 GraphQL 리졸버
 * 미디어 파일과 썸네일 관련 쿼리를 처리합니다.
 */
@Resolver(() => Media)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 미디어 ID로 미디어 조회
   */
  @Query(() => Media, {
    nullable: true,
    description: '미디어 ID로 미디어 조회',
  })
  @UseGuards(GqlAuthGuard)
  async getMedia(
    @Args('mediaId') mediaId: string,
    @CurrentUser() user: User,
  ): Promise<Media | null> {
    return this.mediaService
      .findByIds([mediaId])
      .then((media) => media[0] || null);
  }

  /**
   * 미디어의 썸네일 목록 조회 (ResolveField)
   */
  @ResolveField(() => [Thumbnail], { description: '미디어의 썸네일 목록' })
  async thumbnails(@Parent() media: Media): Promise<Thumbnail[]> {
    return this.mediaService.getThumbnails(media.id);
  }

  /**
   * 플랫폼에 최적화된 썸네일 URL 조회
   */
  @Query(() => String, {
    nullable: true,
    description: '최적화된 썸네일 URL 조회',
  })
  @UseGuards(GqlAuthGuard)
  async getOptimizedThumbnailUrl(
    @Args('mediaId') mediaId: string,
    @Args('isWeb', { defaultValue: false }) isWeb: boolean,
    @Args('isHighDPI', { defaultValue: false }) isHighDPI: boolean,
    @CurrentUser() user: User,
  ): Promise<string | null> {
    return this.mediaService.getOptimizedThumbnailUrl(
      mediaId,
      isWeb,
      isHighDPI,
    );
  }
}

/**
 * 썸네일 GraphQL 리졸버
 */
@Resolver(() => Thumbnail)
export class ThumbnailResolver {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 썸네일의 원본 미디어 조회 (ResolveField)
   */
  @ResolveField(() => Media, { description: '썸네일의 원본 미디어' })
  async media(@Parent() thumbnail: Thumbnail): Promise<Media> {
    const mediaList = await this.mediaService.findByIds([thumbnail.mediaId]);
    return mediaList[0];
  }

  /**
   * 특정 크기의 썸네일 조회
   */
  @Query(() => Thumbnail, {
    nullable: true,
    description: '특정 크기의 썸네일 조회',
  })
  @UseGuards(GqlAuthGuard)
  async getThumbnailBySize(
    @Args('mediaId') mediaId: string,
    @Args('size', { type: () => ThumbnailSize }) size: ThumbnailSize,
    @CurrentUser() user: User,
  ): Promise<Thumbnail | null> {
    return this.mediaService.getThumbnailBySize(mediaId, size);
  }

  /**
   * 미디어의 모든 썸네일 조회
   */
  @Query(() => [Thumbnail], { description: '미디어의 모든 썸네일 조회' })
  @UseGuards(GqlAuthGuard)
  async getMediaThumbnails(
    @Args('mediaId') mediaId: string,
    @CurrentUser() user: User,
  ): Promise<Thumbnail[]> {
    return this.mediaService.getThumbnails(mediaId);
  }
}
