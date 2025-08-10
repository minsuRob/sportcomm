import * as fs from 'fs-extra';
import * as path from 'path';
import { lookup as lookupMimeType } from 'mime-types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@env';
/**
 * 로컬 업로드 디렉터리의 파일을 Supabase Storage로 마이그레이션하는 스크립트
 * - team-logos, images, videos 폴더의 파일을 각각 대응 버킷으로 업로드
 * - 퍼블릭 버킷은 공개 URL을 출력하여 검증을 돕습니다
 *
 * 사용 전 준비사항:
 * - 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (서비스 롤 키)
 * - Supabase Storage에 다음 버킷이 존재해야 합니다: team-logos, post-images, post-videos
 */

type BucketPlan = {
  bucket: string; // 대상 버킷명
  localDir: string; // 로컬 디렉터리 절대경로
  isPublic: boolean; // 퍼블릭 버킷 여부(공개 URL 생성)
};

function buildSupabaseClient(): SupabaseClient {
  // 환경변수 로드(.env.local -> .env)
  const url = SUPABASE_URL;
  const serviceKey = SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function getContentType(filePath: string): string {
  // mime-types 패키지로 콘텐츠 타입 추론, 기본값은 application/octet-stream
  return (lookupMimeType(filePath) || 'application/octet-stream') as string;
}

function toUnixKey(localRoot: string, filePathAbs: string): string {
  // 로컬 루트 기준 상대경로 → 스토리지 오브젝트 키(슬래시 통일)
  const rel = path.relative(localRoot, filePathAbs);
  return rel.split(path.sep).join('/');
}

async function uploadDirectory(
  supabase: SupabaseClient,
  plan: BucketPlan,
): Promise<void> {
  if (!(await fs.pathExists(plan.localDir))) {
    console.warn(`⚠️ 로컬 디렉터리가 존재하지 않습니다: ${plan.localDir}`);
    return;
  }

  console.log(
    `\n📂 업로드 시작 - 버킷: ${plan.bucket}, 경로: ${plan.localDir}`,
  );

  let success = 0;
  let failed = 0;

  for await (const absPath of walkFiles(plan.localDir)) {
    const key = toUnixKey(plan.localDir, absPath);
    const contentType = getContentType(absPath);
    try {
      const buffer = await fs.readFile(absPath);
      const { error } = await supabase.storage
        .from(plan.bucket)
        .upload(key, buffer, { contentType, upsert: true });

      if (error) throw error;
      success += 1;

      if (plan.isPublic) {
        const { data } = supabase.storage.from(plan.bucket).getPublicUrl(key);
        console.log(`✅ 업로드 성공: ${key} → ${data.publicUrl}`);
      } else {
        console.log(`✅ 업로드 성공(비공개): ${key}`);
      }
    } catch (e: any) {
      failed += 1;
      console.error(`❌ 업로드 실패: ${key} - ${e?.message || e}`);
    }
  }

  console.log(`📊 결과 - 성공: ${success}, 실패: ${failed}`);
}

async function ensureBucketExists(
  supabase: SupabaseClient,
  bucket: string,
  isPublic: boolean,
): Promise<void> {
  try {
    // createBucket는 동일 이름이 있으면 에러를 반환 → 이미 존재 에러는 무시
    const { error } = await supabase.storage.createBucket(bucket, {
      public: isPublic,
      fileSizeLimit: '50mb',
    });
    if (error) {
      const msg = String(error.message || error);
      if (/already exists/i.test(msg)) {
        console.log(`ℹ️ 버킷 이미 존재: ${bucket}`);
      } else {
        console.warn(`⚠️ 버킷 생성 실패(${bucket}): ${msg}`);
      }
    } else {
      console.log(`🪣 버킷 생성: ${bucket} (public=${isPublic})`);
    }
  } catch (e: any) {
    console.warn(`⚠️ 버킷 생성 중 예외(${bucket}): ${e?.message || e}`);
  }
}

async function main(): Promise<void> {
  // 워크스페이스 기준 경로 계산
  const beRoot = path.resolve(__dirname, '..', '..');
  const uploadsRoot = path.join(beRoot, 'uploads');

  const plans: BucketPlan[] = [
    {
      bucket: 'team-logos',
      localDir: path.join(uploadsRoot, 'team-logos'),
      isPublic: true,
    },
    {
      bucket: 'post-images',
      localDir: path.join(uploadsRoot, 'images'),
      isPublic: true,
    },
    {
      bucket: 'post-videos',
      localDir: path.join(uploadsRoot, 'videos'),
      isPublic: true, // 초기 전환 간소화를 위해 공개, 이후 필요 시 private 전환 권장
    },
  ];

  const supabase = buildSupabaseClient();

  // 버킷이 없다면 생성 시도(이미 존재하면 무시)
  for (const plan of plans) {
    await ensureBucketExists(supabase, plan.bucket, plan.isPublic);
  }

  for (const plan of plans) {
    await uploadDirectory(supabase, plan);
  }
}

main()
  .then(() => {
    console.log('\n🎉 마이그레이션 완료');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 마이그레이션 실패:', err);
    process.exit(1);
  });
