import sharp from "sharp"
import { mkdir } from "node:fs/promises"

// De gedeelde ster uit components/logo.tsx en app/icon.svg: witte helft plus
// oranje helft. Bron van waarheid voor het app icoon en de splash.
const WHITE =
  "M386.0 164C377.0 292.738,295.1 389.38,186.0 400C295.1 410.62,377.0 507.262,386.0 636Z"
const ORANGE =
  "M414.0 164C423.0 292.738,504.9 389.38,614.0 400C504.9 410.62,423.0 507.262,414.0 636Z"

function iconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="${size}" height="${size}">
  <rect width="800" height="800" fill="#0b0b0f"/>
  <path fill="#FFFFFF" d="${WHITE}"/>
  <path fill="#FF6A00" d="${ORANGE}"/>
</svg>`
}

function splashSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="${size}" height="${size}">
  <rect width="2732" height="2732" fill="#0A0A0B"/>
  <g transform="translate(866,866) scale(1.25)">
    <path fill="#FFFFFF" d="${WHITE}"/>
    <path fill="#FF6A00" d="${ORANGE}"/>
  </g>
</svg>`
}

await mkdir("assets", { recursive: true })
await sharp(Buffer.from(iconSvg(1024))).png().toFile("assets/icon.png")
await sharp(Buffer.from(splashSvg(2732))).png().toFile("assets/splash.png")
await sharp(Buffer.from(splashSvg(2732))).png().toFile("assets/splash-dark.png")
console.log("icon en splash gegenereerd in assets/")
