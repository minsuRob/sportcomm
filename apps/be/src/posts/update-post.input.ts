import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CreatePostInput } from './create-post.input';

@InputType()
export class UpdatePostInput extends PartialType(CreatePostInput) {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
