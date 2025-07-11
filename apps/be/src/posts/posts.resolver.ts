import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { Post } from './post.entity';
import { PostsService } from './posts.service';

/**
 * @description 게시물 데이터와 관련된 GraphQL 요청(쿼리, 뮤테이션)을 처리하는 리졸버입니다.
 * @summary `@Resolver()` 데코레이터에 `Post` 엔티티를 전달하여 이 리졸버가 `Post` 타입을 처리함을 명시합니다.
 */
@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  /**
   * @description 페이지네이션을 적용하여 게시물 목록을 조회합니다.
   * @summary 이 쿼리는 공개적으로 접근 가능하며, 인증이 필요하지 않습니다.
   * @param take - 한 번에 가져올 게시물의 수.
   * @param skip - 건너뛸 게시물의 수.
   * @returns 게시물 객체의 배열.
   */
  @Query(() => [Post], {
    name: 'posts',
    description: '페이지네이션으로 게시물 목록을 조회합니다.',
  })
  findAll(
    @Args('take', {
      type: () => Int,
      defaultValue: 10,
      description: '가져올 개수',
    })
    take: number,
    @Args('skip', {
      type: () => Int,
      defaultValue: 0,
      description: '건너뛸 개수',
    })
    skip: number,
  ): Promise<Post[]> {
    return this.postsService.findAll(take, skip);
  }

  /**
   * @description ID를 사용하여 단일 게시물을 조회합니다.
   * @summary 이 쿼리는 공개적으로 접근 가능하며, 인증이 필요하지 않습니다.
   * @param id - 조회할 게시물의 UUID.
   * @returns 조회된 게시물 객체 또는 null.
   */
  @Query(() => Post, {
    name: 'post',
    nullable: true,
    description: 'ID로 단일 게시물을 조회합니다.',
  })
  async findOne(@Args('id', { type: () => String }) id: string): Promise<Post> {
    const post = await this.postsService.findOne(id);
    if (!post) {
      // 서비스에서 던진 예외가 GraphQL 응답으로 잘 변환되지만,
      // 리졸버 수준에서 명시적으로 확인하는 것도 좋은 패턴입니다.
      throw new NotFoundException(`ID가 "${id}"인 게시물을 찾을 수 없습니다.`);
    }
    return post;
  }

  /**
   * @description 새로운 게시물을 생성합니다.
   * @summary `JwtAuthGuard`를 통해 인증된 사용자만 이 뮤테이션을 호출할 수 있습니다.
   * `CurrentUser` 데코레이터로 현재 로그인된 사용자의 정보를 받아와 작성자(authorId)로 사용합니다.
   * @param user - `@CurrentUser()` 데코레이터에 의해 주입된 현재 사용자 정보.
   * @param createPostInput - 게시물 생성을 위한 입력 데이터 (내용, 타입).
   * @returns 생성된 게시물 객체.
   */
  @Mutation(() => Post, { description: '새로운 게시물을 작성합니다.' })
  @UseGuards(JwtAuthGuard)
  createPost(
    @CurrentUser() user: { id: string },
    @Args('createPostInput') createPostInput: CreatePostInput,
  ): Promise<Post> {
    return this.postsService.create(createPostInput, user.id);
  }

  /**
   * @description 기존 게시물을 수정합니다.
   * @summary `JwtAuthGuard`로 인증을, 서비스 레이어에서 작성자 본인인지 권한을 확인합니다.
   * @param user - 현재 사용자 정보.
   * @param updatePostInput - 게시물 수정을 위한 입력 데이터 (게시물 ID, 내용, 타입).
   * @returns 수정된 게시물 객체.
   */
  @Mutation(() => Post, { description: '기존 게시물을 수정합니다.' })
  @UseGuards(JwtAuthGuard)
  updatePost(
    @CurrentUser() user: { id: string },
    @Args('updatePostInput') updatePostInput: UpdatePostInput,
  ): Promise<Post> {
    return this.postsService.update(user.id, updatePostInput);
  }

  /**
   * @description 게시물을 소프트 삭제합니다.
   * @summary `JwtAuthGuard`로 인증을, 서비스 레이어에서 작성자 본인인지 권한을 확인합니다.
   * @param user - 현재 사용자 정보.
   * @param id - 삭제할 게시물의 UUID.
   * @returns 소프트 삭제 처리된 게시물 객체.
   */
  @Mutation(() => Post, { description: '게시물을 삭제합니다 (소프트 삭제).' })
  @UseGuards(JwtAuthGuard)
  removePost(
    @CurrentUser() user: { id: string },
    @Args('id', { type: () => String }) id: string,
  ): Promise<Post> {
    return this.postsService.remove(user.id, id);
  }
}
