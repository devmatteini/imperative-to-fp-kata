import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "fs"
import * as path from "path"
import sharp from "sharp"

import { imageTypesRegex } from "./resize-images"
import * as Effect from "effect/Effect"
import { FileSystem } from "@effect/platform"
import { Data } from "effect"

const WIDTH_THRESHOLD = 1500

export class NoSourceDirectoryError extends Data.TaggedError(
    "NoSourceDirectoryError",
)<{
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

export const compress = (sourceDir: string, outputDir: string) =>
    Effect.gen(function* (_) {
        yield* _(checkSourceDirectoryExists(sourceDir))

        yield* _(Effect.logInfo(`Reading images from ${sourceDir}`))

        yield* _(Effect.promise(() => main(sourceDir, outputDir)))
    })

export async function main(sourceDir: string, outputDir: string) {
    const outputDirAbsolute = path.join(sourceDir, outputDir)
    rmSync(outputDirAbsolute, { recursive: true, force: true })
    mkdirSync(outputDirAbsolute, { recursive: true })

    const tasks = readdirSync(sourceDir)
        // keep-line
        .filter((file) => file.match(imageTypesRegex))
        .map((file) =>
            processOne(path.join(sourceDir, file), outputDirAbsolute),
        )
    const results = await Promise.all(tasks)

    console.log(`\nProcessed ${results.length} images \n`)
    console.log(`\nDONE\n`)
}

async function processOne(inputFile: string, outputDir: string) {
    const fileName = path.basename(inputFile)
    const outputFile = path.join(outputDir, `${fileName}.webp`)

    const metadata = await sharp(inputFile).metadata()
    const stat = statSync(inputFile)
    const sizeInKb = stat.size / 1024

    if (sizeInKb < 50 || !metadata.width || metadata.width < WIDTH_THRESHOLD) {
        copyFileSync(inputFile, outputFile)
        return { name: outputFile }
    } else {
        const info = await sharp(inputFile)
            .resize({ width: WIDTH_THRESHOLD, withoutEnlargement: true })
            .withMetadata()
            .webp({ lossless: false, quality: 80 })
            .toFile(outputFile)
        return { name: outputFile, ...info }
    }
}
