import { expect, test } from "vitest"
import { resizeImages } from "./resize-images"
import * as Effect from "effect/Effect"
import { readFileSync } from "fs"

test("end to end", async () => {
    await Effect.runPromise(resizeImages.handler({}))

    expect(
        readFileSync("./src/public/team-photos/processed/images.json"),
    ).toMatchSnapshot()
})
