import { InputType, Field } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { UploadStatus } from '../media.entity';

/**
 * @description 미디어 업로드 상태 및 URL 업데이트를 위한 입력 데이터 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, updateMediaStatus 뮤테이션의 인자로 사용됩니다.
 * 파일 업로드가 완료되거나 실패했을 때 호출됩니다.
 */
@InputType()
export class UpdateMediaStatusInput {
  /**
   * @description 상태를 업데이트할 미디어의 ID
   * @summary UUID 형식이어야 합니다.
   */
  @Field(() => String, { description: '업데이트할 미디어의 ID' })
  @IsUUID('4', { message: '유효한 미디어 ID(UUID)가 아닙니다.' })
  @IsNotEmpty({ message: '미디어 ID는 비워둘 수 없습니다.' })
  id: string;

  /**
   * @description 새로운 업로드 상태
   * @summary 'COMPLETED' 또는 'FAILED' 값 중 하나여야 합니다.
   */
  @Field(() => UploadStatus, { description: '새로운 업로드 상태' })
  @IsEnum(UploadStatus, { message: '유효한 업로드 상태가 아닙니다.' })
  @IsNotEmpty({ message: '업로드 상태는 비워둘 수 없습니다.' })
  status: UploadStatus;

  /**
   * @description 업로드 완료 후 미디어에 접근할 수 있는 URL
   * @summary 이 필드는 status가 'COMPLETED'일 때만 제공되어야 합니다. 유효한 URL 형식이어야 합니다.
   */
  @Field(() => String, {
    nullable: true,
    description: '업로드 완료된 미디어의 URL',
  })
  @IsOptional()
  @IsUrl({}, { message: '유효한 URL 형식이 아닙니다.' })
  url?: string;
}
