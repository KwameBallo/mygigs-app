import sharp from "sharp"
import { readFileSync } from "node:fs"

const svg = readFileSync("app/icon.svg")

async function make(size, out) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out)
  console.log("wrote", out, size)
}

await make(512, "public/icon-512.png")
await make(192, "public/icon-192.png")
await make(180, "app/apple-icon.png")
console.log("done")
