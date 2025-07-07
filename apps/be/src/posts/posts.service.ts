import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostInput } from './create-post.input';
import { UpdatePostInput } from './update-post.input';
import { User } from '../users/user.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  /**
   * Creates a new post.
   * @param createPostInput - The data for the new post.
   * @param author - The user creating the post.
   * @returns The newly created post.
   */
  async create(
    createPostInput: CreatePostInput,
    authorId: string,
  ): Promise<Post> {
    const newPost = this.postsRepository.create({
      ...createPostInput,
      authorId,
    });
    return this.postsRepository.save(newPost);
  }

  /**
   * Finds all posts with pagination.
   * @param take - The number of posts to take.
   * @param skip - The number of posts to skip.
   * @returns An array of posts.
   */
  async findAll(take: number, skip: number): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'comments', 'media'], // Eager load relations needed for the feed
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
  }

  /**
   * Finds a single post by its ID.
   * @param id - The ID of the post to find.
   * @returns The found post.
   * @throws NotFoundException if the post does not exist.
   */
  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'comments', 'media', 'versions'],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }
    return post;
  }

  /**
   * Updates an existing post.
   * @param id - The ID of the post to update.
   * @param updatePostInput - The new data for the post.
   * @returns The updated post.
   * @throws NotFoundException if the post does not exist.
   */
  async update(id: string, updatePostInput: UpdatePostInput): Promise<Post> {
    // `preload` creates a new entity based on the object passed into it.
    // It first looks for an entity with the given ID in the database, and if it finds one,
    // it replaces all its values with the new ones from the plain object.
    const post = await this.postsRepository.preload(updatePostInput);

    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    // TODO: Add logic here to create a new PostVersion before saving.

    return this.postsRepository.save(post);
  }

  /**
   * Soft-deletes a post.
   * @param id - The ID of the post to remove.
   * @returns The removed post entity (without being saved again).
   * @throws NotFoundException if the post does not exist.
   */
  async remove(id: string): Promise<Post> {
    const post = await this.findOne(id);
    await this.postsRepository.softDelete(id);
    return post; // Return the entity as it was before deletion for the GraphQL response.
  }
}
