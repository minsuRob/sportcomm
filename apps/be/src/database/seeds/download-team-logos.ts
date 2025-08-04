import * as https from 'https';
import * as fs from 'fs-extra';
import * as path from 'path';
import sharp from 'sharp';

// Define the output directory for the logos
const outputDir = path.resolve(__dirname, '../../../uploads/team-logos');

// Define teams with their names and potential logo URLs
const teams = [
  // Football
  {
    name: 'tottenham',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/1200px-Tottenham_Hotspur.svg.png',
  },
  {
    name: 'newcastle',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Newcastle_United_Logo.svg/1200px-Newcastle_United_Logo.svg.png',
  },
  {
    name: 'atletico',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/1200px-Atletico_Madrid_2017_logo.svg.png',
  },
  {
    name: 'mancity',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/1200px-Manchester_City_FC_badge.svg.png',
  },
  {
    name: 'liverpool',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/1200px-Liverpool_FC.svg.png',
  },
  // Baseball
  {
    name: 'doosan',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Doosan_Bears.svg/1200px-Doosan_Bears.svg.png',
  },
  {
    name: 'hanwha',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/8/83/Hanwha_Eagles_logo.svg/1200px-Hanwha_Eagles_logo.svg.png',
  },
  {
    name: 'lg',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LG_Twins.svg/1200px-LG_Twins.svg.png',
  },
  {
    name: 'samsung',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/5/58/Samsung_Lions_logo.svg/1200px-Samsung_Lions_logo.svg.png',
  },
  {
    name: 'kia',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/KIA_Tigers_logo.svg/1200px-KIA_Tigers_logo.svg.png',
  },
  // eSports
  {
    name: 't1',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/T1_logo.svg/1200px-T1_logo.svg.png',
  },
  {
    name: 'geng',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Gen.G_logo.svg/1200px-Gen.G_logo.svg.png',
  },
  {
    name: 'drx',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/DRX_logo.svg/1200px-DRX_logo.svg.png',
  },
  {
    name: 'kt',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/KT_Rolster_logo.svg/1200px-KT_Rolster_logo.svg.png',
  },
  {
    name: 'damwon',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/en/thumb/7/73/DWG_KIA_logo.svg/1200px-DWG_KIA_logo.svg.png',
  },
];

/**
 * Downloads an image from a given URL.
 * @param url The URL of the image to download.
 * @returns A Promise that resolves with the image buffer.
 */
function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(
            new Error(
              `Failed to download image. Status code: ${response.statusCode}`,
            ),
          );
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', (err) => reject(err));
  });
}

/**
 * Processes and saves a team logo.
 * @param teamName The name of the team.
 * @param imageUrl The URL of the logo image.
 */
async function processLogo(teamName: string, imageUrl: string): Promise<void> {
  const outputFilename = `${teamName}.webp`;
  const outputPath = path.join(outputDir, outputFilename);

  try {
    console.log(`⬇️  Downloading logo for ${teamName} from ${imageUrl}`);
    const imageBuffer = await downloadImage(imageUrl);

    console.log(`⚙️  Processing logo for ${teamName}`);
    await sharp(imageBuffer)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toFormat('webp')
      .toFile(outputPath);

    console.log(`✅ Saved logo for ${teamName} to ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to process logo for ${teamName}:`, error);
  }
}

/**
 * Main function to download and process all team logos.
 */
async function main() {
  console.log('🚀 Starting team logo download process...');
  await fs.ensureDir(outputDir);

  for (const team of teams) {
    await processLogo(team.name, team.logoUrl);
  }

  console.log('🎉 All logos processed!');
}

// Run the main function
main().catch(console.error);
