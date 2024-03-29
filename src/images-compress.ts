import * as path from "path"
import sharp from "sharp"

import { imageTypesRegex } from "./resize-images"
import * as Effect from "effect/Effect"
import { FileSystem } from "@effect/platform"
import { Data } from "effect"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"

const WIDTH_THRESHOLD = 1500

export class NoSourceDirectoryError extends Data.TaggedError("NoSourceDirectoryError")<{
    sourceDir: string
}> {
    override toString(): string {
        return `Source directory ${this.sourceDir} does not exist`
    }
}

const checkSourceDirectoryExists = (sourceDir: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)
        const exists = yield* _(fs.exists(sourceDir))

        if (!exists) yield* _(new NoSourceDirectoryError({ sourceDir }))
    })

const safeRemove = (dir: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)
        const exists = yield* _(fs.exists(dir))
        // TODO: add force: boolean option as node rmSync
        if (exists) yield* _(fs.remove(dir, { recursive: true }))
    })

export const compress = (sourceDir: string, outputDir: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        yield* _(checkSourceDirectoryExists(sourceDir))

        yield* _(Effect.logInfo(`Reading images from ${sourceDir}`))

        const outputDirAbsolute = path.join(sourceDir, outputDir)
        yield* _(safeRemove(outputDirAbsolute))
        yield* _(fs.makeDirectory(outputDirAbsolute, { recursive: true }))

        const filesToBeProcessed = F.pipe(
            yield* _(fs.readDirectory(sourceDir)),
            ROA.filter((file) => imageTypesRegex.test(file)),
            ROA.map((file) => processOne(path.join(sourceDir, file), outputDirAbsolute)),
        )

        const results = yield* _(Effect.all(filesToBeProcessed, { concurrency: 5 }))

        yield* _(Effect.logInfo(`Processed ${results.length} images`))
        yield* _(Effect.logInfo("DONE"))
    })

const processOne = (inputFile: string, outputDir: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        const fileName = path.basename(inputFile)
        const outputFile = path.join(outputDir, `${fileName}.webp`)

        const metadata = yield* _(Effect.promise(() => sharp(inputFile).metadata()))

        const stat = yield* _(fs.stat(inputFile))
        const sizeInKb = Number(stat.size) / 1024

        if (sizeInKb < 50 || !metadata.width || metadata.width < WIDTH_THRESHOLD) {
            yield* _(fs.copyFile(inputFile, outputFile))
            return { name: outputFile }
        }

        const info = yield* _(
            Effect.promise(() =>
                sharp(inputFile)
                    .resize({
                        width: WIDTH_THRESHOLD,
                        withoutEnlargement: true,
                    })
                    .withMetadata()
                    .webp({ lossless: false, quality: 80 })
                    .toFile(outputFile),
            ),
        )
        return { name: outputFile, ...info }
    })
