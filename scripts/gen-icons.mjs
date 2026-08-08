import { Resvg } from "@resvg/resvg-js"
import { readFileSync, writeFileSync } from "node:fs"

const svg = readFileSync("app/icon.svg", "utf8")
const font = readFileSync("scripts/geist-bold.ttf")

function make(size, out) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: {
      fontBuffers: [font],
      defaultFontFamily: "Geist",
      loadSystemFonts: false,
    },
  })
  writeFileSync(out, r.render().asPng())
  console.log("wrote", out, size)
}

make(512, "public/icon-512.png")
make(192, "public/icon-192.png")
make(180, "app/apple-icon.png")
console.log("done")
