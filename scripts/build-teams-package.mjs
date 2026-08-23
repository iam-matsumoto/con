import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const rawUrl = process.env.TEAMS_APP_URL || process.argv[2]

if (!rawUrl) {
  console.error('TEAMS_APP_URL が未設定です。例: TEAMS_APP_URL=https://example.vercel.app npm run teams:package')
  process.exit(1)
}

let appUrl
try {
  appUrl = new URL(rawUrl)
} catch {
  console.error('TEAMS_APP_URL は https:// から始まる有効なURLにしてください。')
  process.exit(1)
}

if (appUrl.protocol !== 'https:') {
  console.error('TeamsタブにはHTTPS URLが必要です。')
  process.exit(1)
}

const templatePath = path.join(root, 'teams-app', 'manifest.template.json')
const outDir = path.join(root, 'teams-app', 'dist')
fs.mkdirSync(outDir, { recursive: true })

const normalizedUrl = appUrl.origin + appUrl.pathname.replace(/\/$/, '')
const manifest = fs.readFileSync(templatePath, 'utf8')
  .replaceAll('{{APP_URL}}', normalizedUrl)
  .replaceAll('{{APP_DOMAIN}}', appUrl.host)

fs.writeFileSync(path.join(outDir, 'manifest.json'), manifest)
fs.copyFileSync(path.join(root, 'teams-app', 'color.png'), path.join(outDir, 'color.png'))
fs.copyFileSync(path.join(root, 'teams-app', 'outline.png'), path.join(outDir, 'outline.png'))

const packagePath = path.join(root, 'teams-app', 'company-schedule-teams-app.zip')
try { fs.rmSync(packagePath, { force: true }) } catch {}

if (process.platform === 'win32') {
  const ps = `Compress-Archive -Path \"${outDir}\\manifest.json\",\"${outDir}\\color.png\",\"${outDir}\\outline.png\" -DestinationPath \"${packagePath}\" -Force`
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' })
} else {
  execFileSync('zip', ['-j', packagePath,
    path.join(outDir, 'manifest.json'),
    path.join(outDir, 'color.png'),
    path.join(outDir, 'outline.png')], { stdio: 'inherit' })
}

console.log(`Teamsアプリパッケージを作成しました: ${packagePath}`)
