import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { CreatePostInput } from './create-post.input';
// The UpdatePostInput file will be created in a subsequent step.
// For now, we assume it exists and will be implemented.
import { UpdatePostInput } from './update-post.input';
import { UseGuards } from '@nestjs/common';
// import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
// import { User } from '../users/user.entity';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => [Post], {
    name: 'posts',
    description: 'Retrieve a list of posts with pagination.',
  })
  findAll(
    @Args('take', {
      type: () => Int,
      defaultValue: 10,
      description: 'Number of items to retrieve.',
    })
    take: number,
    @Args('skip', {
      type: () => Int,
      defaultValue: 0,
      description: 'Number of items to skip.',
    })
    skip: number,
  ): Promise<Post[]> {
    return this.postsService.findAll(take, skip);
  }

  @Query(() => Post, {
    name: 'post',
    nullable: true,
    description: 'Retrieve a single post by its ID.',
  })
  findOne(@Args('id', { type: () => String }) id: string): Promise<Post> {
    return this.postsService.findOne(id);
  }

  @Mutation(() => Post, {
    description: 'Create a new post. Authentication is required.',
  })
  // @UseGuards(GqlAuthGuard)
  createPost(
    @Args('createPostInput') createPostInput: CreatePostInput,
    // @CurrentUser() user: User,
  ): Promise<Post> {
    // TODO: Replace this placeholder with the actual authenticated user's ID.
    const authorId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
    return this.postsService.create(createPostInput, authorId);
  }

  @Mutation(() => Post, {
    description: 'Update an existing post. User must be the author.',
  })
  // @UseGuards(GqlAuthGuard)
  updatePost(
    @Args('updatePostInput') updatePostInput: UpdatePostInput,
    // @CurrentUser() user: User,
  ): Promise<Post> {
    // TODO: Add authorization logic to ensure the user is the author of the post.
    // e.g., if (post.authorId !== user.id) throw new ForbiddenException();
    return this.postsService.update(updatePostInput.id, updatePostInput);
  }

  @Mutation(() => Post, {
    description: 'Soft-delete a post. User must be the author.',
  })
  // @UseGuards(GqlAuthGuard)
  removePost(
    @Args('id', { type: () => String }) id: string,
    // @CurrentUser() user: User,
  ): Promise<Post> {
    // TODO: Add authorization logic here as well.
    return this.postsService.remove(id);
  }
}
