import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const html = readFileSync('index.original.html', 'utf8')
mkdirSync('public/images', { recursive: true })

// Match all base64 image src attributes
const matches = [...html.matchAll(/src="data:image\/(jpeg|png|webp);base64,([^"]+)"/g)]

if (matches.length === 0) {
  console.log('No base64 images found. Checking for other patterns...')
  // Also check background-image url patterns
  const bgMatches = [...html.matchAll(/url\(["']?data:image\/(jpeg|png|webp);base64,([^"')]+)["']?\)/g)]
  bgMatches.forEach((match, i) => {
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const buf = Buffer.from(match[2], 'base64')
    const name = `public/images/bg-${i}.${ext}`
    writeFileSync(name, buf)
    console.log(`Wrote ${name} (${(buf.length / 1024).toFixed(1)} KB)`)
  })
} else {
  matches.forEach((match, i) => {
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const buf = Buffer.from(match[2], 'base64')
    const name = `public/images/img-${i}.${ext}`
    writeFileSync(name, buf)
    console.log(`Wrote ${name} (${(buf.length / 1024).toFixed(1)} KB)`)
  })
}
