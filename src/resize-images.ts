import { Command } from "@effect/cli"
import * as Effect from "effect/Effect"
import { main as compress } from "./images-compress"
import { main as writeJson } from "./images-json"
import path from "path"

export const imageTypesRegex = /\.(png|jpeg|jpg|webp)$/i
const sourceDirRelative = "./public/team-photos"
const sourceDirAbsolute = new URL(sourceDirRelative, import.meta.url).pathname
const compressOutputDir = "processed"
const processedDirAbsolute = path.join(sourceDirAbsolute, compressOutputDir)
const finalImageSrcBaseUrl = `/team-photos/${compressOutputDir}`
const jsonOutputFile = "images.json"

export const resizeImages = Command.make("resize-images", {}, () =>
    Effect.gen(function* (_) {
        yield* _(
            Effect.promise(() =>
                compress(sourceDirAbsolute, compressOutputDir),
            ),
        )

        yield* _(
            Effect.promise(() =>
                writeJson(
                    processedDirAbsolute,
                    jsonOutputFile,
                    finalImageSrcBaseUrl,
                ),
            ),
        )
    }),
)
