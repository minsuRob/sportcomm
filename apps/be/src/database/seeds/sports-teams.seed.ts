import { DataSource } from 'typeorm';
import { Sport, Team } from '../../entities';

/**
 * 스포츠 및 팀 초기 데이터 시드
 *
 * 시스템에 기본 스포츠 카테고리와 팀 데이터를 생성합니다.
 */
export async function seedSportsAndTeams(
  dataSource: DataSource,
): Promise<void> {
  const sportRepository = dataSource.getRepository(Sport);
  const teamRepository = dataSource.getRepository(Team);

  console.log('🏆 스포츠 및 팀 데이터 시드 시작...');

  // 스포츠 카테고리 데이터
  const sportsData = [
    {
      name: '축구',
      icon: '⚽',
      description: '전 세계에서 가장 인기 있는 스포츠',
      sortOrder: 1,
      teams: [
        {
          name: '토트넘',
          code: 'TOTTENHAM',
          mainColor: '#132257',
          subColor: '#FFFFFF',
          darkMainColor: '#1a2d5a',
          darkSubColor: '#f0f0f0',
          icon: '⚽',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/tottenham.webp',
          description: '토트넘 홋스퍼 FC',
          sortOrder: 1,
        },
        {
          name: '뉴캐슬',
          code: 'NEWCASTLE',
          mainColor: '#241F20',
          subColor: '#FFFFFF',
          darkMainColor: '#2a2526',
          darkSubColor: '#f0f0f0',
          icon: '⚽',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/newcastle.webp',
          description: '뉴캐슬 유나이티드 FC',
          sortOrder: 2,
        },
        {
          name: '아틀레티코',
          code: 'ATLETICO_MADRID',
          mainColor: '#CE2029',
          subColor: '#000000',
          darkMainColor: '#a11920',
          darkSubColor: '#333333',
          icon: '⚽',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/atletico.webp',
          description: '아틀레티코 마드리드',
          sortOrder: 3,
        },
        {
          name: '맨시티',
          code: 'MANCHESTER_CITY',
          mainColor: '#6CABDD',
          subColor: '#000000',
          darkMainColor: '#5a9ac7',
          darkSubColor: '#333333',
          icon: '⚽',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/mancity.webp',
          description: '맨체스터 시티 FC',
          sortOrder: 4,
        },
        {
          name: '리버풀',
          code: 'LIVERPOOL',
          mainColor: '#C8102E',
          subColor: '#000000',
          darkMainColor: '#a20d26',
          darkSubColor: '#333333',
          icon: '⚽',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/liverpool.webp',
          description: '리버풀 FC',
          sortOrder: 5,
        },
      ],
    },
    {
      name: '야구',
      icon: '⚾',
      description: '한국 프로야구 KBO 리그',
      sortOrder: 2,
      teams: [
        {
          name: '두산',
          code: 'DOOSAN_BEARS',
          mainColor: '#131230',
          subColor: '#FFFFFF',
          darkMainColor: '#1a1a3a',
          darkSubColor: '#f0f0f0',
          icon: '⚾',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/doosan.webp',
          description: '두산 베어스',
          sortOrder: 1,
        },
        {
          name: '한화',
          code: 'HANWHA_EAGLES',
          mainColor: '#FF6600',
          subColor: '#000000',
          darkMainColor: '#cc5200',
          darkSubColor: '#333333',
          icon: '⚾',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/hanwha.webp',
          description: '한화 이글스',
          sortOrder: 2,
        },
        {
          name: 'LG',
          code: 'LG_TWINS',
          mainColor: '#C30452',
          subColor: '#000000',
          darkMainColor: '#9d0342',
          darkSubColor: '#333333',
          icon: '⚾',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/lg.webp',
          description: 'LG 트윈스',
          sortOrder: 3,
        },
        {
          name: '삼성',
          code: 'SAMSUNG_LIONS',
          mainColor: '#074CA1',
          subColor: '#FFFFFF',
          darkMainColor: '#0a5ac7',
          darkSubColor: '#f0f0f0',
          icon: '⚾',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/samsung.webp',
          description: '삼성 라이온즈',
          sortOrder: 4,
        },
        {
          name: 'KIA',
          code: 'KIA_TIGERS',
          mainColor: '#EA0029',
          subColor: '#000000',
          darkMainColor: '#c10022',
          darkSubColor: '#333333',
          icon: '⚾',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/kia.webp',
          description: 'KIA 타이거즈',
          sortOrder: 5,
        },
      ],
    },
    {
      name: 'e스포츠',
      icon: '🎮',
      description: '리그 오브 레전드 LCK',
      sortOrder: 3,
      teams: [
        {
          name: 'T1',
          code: 'T1',
          mainColor: '#E2012D',
          subColor: '#000000',
          darkMainColor: '#b80124',
          darkSubColor: '#333333',
          icon: '🎮',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/t1.webp',
          description: 'T1 (구 SK Telecom T1)',
          sortOrder: 1,
        },
        {
          name: 'Gen.G',
          code: 'GENG',
          mainColor: '#AA8B56',
          subColor: '#000000',
          darkMainColor: '#8f7347',
          darkSubColor: '#333333',
          icon: '🎮',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/geng.webp',
          description: 'Gen.G Esports',
          sortOrder: 2,
        },
        {
          name: 'DRX',
          code: 'DRX',
          mainColor: '#2E5BFF',
          subColor: '#000000',
          darkMainColor: '#254ecc',
          darkSubColor: '#333333',
          icon: '🎮',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/drx.webp',
          description: 'DRX',
          sortOrder: 3,
        },
        {
          name: 'KT',
          code: 'KT_ROLSTER',
          mainColor: '#D4002A',
          subColor: '#000000',
          darkMainColor: '#aa0022',
          darkSubColor: '#333333',
          icon: '🎮',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/kt.webp',
          description: 'KT 롤스터',
          sortOrder: 4,
        },
        {
          name: '담원',
          code: 'DAMWON_KIA',
          mainColor: '#004B9F',
          subColor: '#FFFFFF',
          darkMainColor: '#005ac7',
          darkSubColor: '#f0f0f0',
          icon: '🎮',
          logoUrl:
            'https://iikgupdmnlmhycmtuqzj.supabase.co/storage/v1/object/public/team-logos/damwon.webp',
          description: '담원 기아',
          sortOrder: 5,
        },
      ],
    },
  ];

  // 스포츠 및 팀 데이터 생성
  for (const sportData of sportsData) {
    // 이미 존재하는 스포츠인지 확인
    let sport = await sportRepository.findOne({
      where: { name: sportData.name },
    });

    if (!sport) {
      // 스포츠 생성
      sport = sportRepository.create({
        name: sportData.name,
        icon: sportData.icon,
        description: sportData.description,
        sortOrder: sportData.sortOrder,
        isActive: true,
      });
      sport = await sportRepository.save(sport);
      console.log(`✅ 스포츠 생성: ${sport.name}`);
    } else {
      console.log(`⏭️  스포츠 이미 존재: ${sport.name}`);
    }

    // 팀 데이터 생성
    for (const teamData of sportData.teams) {
      // 이미 존재하는 팀인지 확인
      const existingTeam = await teamRepository.findOne({
        where: { code: teamData.code },
      });

      if (!existingTeam) {
        const team = teamRepository.create({
          name: teamData.name,
          code: teamData.code,
          mainColor: teamData.mainColor,
          subColor: teamData.subColor,
          darkMainColor: teamData.darkMainColor,
          darkSubColor: teamData.darkSubColor,
          icon: teamData.icon,
          logoUrl: teamData.logoUrl,
          description: teamData.description,
          sortOrder: teamData.sortOrder,
          isActive: true,
          sportId: sport.id,
        });
        await teamRepository.save(team);
        console.log(`  ✅ 팀 생성: ${team.name} (${sport.name})`);
      } else {
        // 기존 팀의 sportId 업데이트 (항상 업데이트)
        existingTeam.sportId = sport.id;
        existingTeam.name = teamData.name;
        existingTeam.mainColor = teamData.mainColor;
        existingTeam.subColor = teamData.subColor;
        existingTeam.darkMainColor = teamData.darkMainColor;
        existingTeam.darkSubColor = teamData.darkSubColor;
        existingTeam.icon = teamData.icon;
        existingTeam.logoUrl = teamData.logoUrl;
        existingTeam.description = teamData.description;
        existingTeam.sortOrder = teamData.sortOrder;
        existingTeam.isActive = true;
        await teamRepository.save(existingTeam);
        console.log(`  🔄 팀 업데이트: ${teamData.name} -> ${sport.name}`);
      }
    }
  }

  console.log('🎉 스포츠 및 팀 데이터 시드 완료!');
}

/**
 * 시드 스크립트 실행 함수
 * 개발 환경에서 직접 실행할 수 있습니다.
 */
export async function runSportsTeamsSeed(): Promise<void> {
  const { AppDataSource } = await import('../datasource');

  try {
    await AppDataSource.initialize();
    console.log('📊 데이터베이스 연결 성공');

    await seedSportsAndTeams(AppDataSource);

    console.log('✨ 시드 작업 완료');
  } catch (error) {
    console.error('❌ 시드 작업 실패:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

// 스크립트가 직접 실행될 때
if (require.main === module) {
  runSportsTeamsSeed()
    .then(() => {
      console.log('🚀 시드 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 시드 스크립트 실행 실패:', error);
      process.exit(1);
    });
}
