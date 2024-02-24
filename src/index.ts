import { main as compress } from "./images-compress"
import { main as writeJson } from "./images-json"
import * as path from "path"
import * as Effect from "effect/Effect"
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"

export const imageTypesRegex = /\.(png|jpeg|jpg|webp)$/i
const sourceDirRelative = "./public/team-photos"
const sourceDirAbsolute = new URL(sourceDirRelative, import.meta.url).pathname
const compressOutputDir = "processed"

const processedDirAbsolute = path.join(sourceDirAbsolute, compressOutputDir)
const finalImageSrcBaseUrl = `/team-photos/${compressOutputDir}`
const jsonOutputFile = "images.json"

const resizeImages = Command.make("resize-images", {}, () =>
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

const cli = Command.run(resizeImages, {
    name: "Resize images",
    version: "v1.0.0",
})

Effect.suspend(() => cli(process.argv)).pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain,
)
