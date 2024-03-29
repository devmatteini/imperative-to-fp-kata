import { mkdirSync, writeFileSync } from "fs"
import * as path from "path"
import sharp from "sharp"
import { pick } from "./common/object"

import { imageTypesRegex } from "./resize-images"
import * as Effect from "effect/Effect"
import { FileSystem } from "@effect/platform"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"

export const writeJson = (sourceDir: string, outputFile: string, finalImageSrcBaseUrl: string) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        yield* _(Effect.logInfo(`\nReading images from ${sourceDir}\n`))

        const dir = yield* _(fs.readDirectory(sourceDir))
        const tasks = F.pipe(
            dir,
            ROA.filter((file) => imageTypesRegex.test(file)),
            ROA.map((file) => processOne(path.join(sourceDir, file), finalImageSrcBaseUrl)),
        )
        const results = yield* _(Effect.all(tasks, { concurrency: 5 }))

        const outputFileAbsolute = path.join(sourceDir, outputFile)
        yield* _(Effect.logInfo(`\nWriting results to ${outputFileAbsolute}\n`))

        // TODO: use effect fs
        writeOutputFile(outputFileAbsolute, results)

        yield* _(Effect.logInfo(`\nDONE\n`))
    })

const processOne = (file: string, finalImageSrcBaseUrl: string) =>
    Effect.gen(function* (_) {
        const metadata = yield* _(Effect.promise(() => sharp(file).metadata()))
        const selectedMetadata = pick(["width", "height", "format", "orientation"], metadata)

        const fileName = path.basename(file)
        return { src: `${finalImageSrcBaseUrl}/${fileName}`, ...selectedMetadata }
    })

function writeOutputFile(outputFile: string, content: unknown[]) {
    const outputFileDir = path.dirname(outputFile)
    mkdirSync(outputFileDir, { recursive: true })
    writeFileSync(outputFile, JSON.stringify(content, null, 2), {})
}
