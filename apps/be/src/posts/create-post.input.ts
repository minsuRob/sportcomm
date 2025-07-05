import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, IsEnum } from 'class-validator';
import { PostType } from './post.entity';

@InputType()
export class CreatePostInput {
  @Field()
  @IsNotEmpty({ message: 'Content cannot be empty.' })
  @IsString()
  @MaxLength(1000, { message: 'Content must be 1000 characters or less.' })
  content: string;

  @Field(() => PostType)
  @IsEnum(PostType)
  type: PostType;

  // The authorId will be extracted from the authenticated user's context (e.g., JWT token)
  // in the resolver/service layer, so it's not part of the client input.
}
