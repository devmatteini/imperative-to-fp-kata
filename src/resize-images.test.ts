import { expect, test } from "vitest"
import { resizeImages } from "./resize-images"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import { readFileSync } from "fs"
import { NodeContext } from "@effect/platform-node"

test(
    "end to end",
    async () => {
        await Effect.runPromise(F.pipe(resizeImages.handler({}), Effect.provide(NodeContext.layer)))

        expect(readFileSync("./src/public/team-photos/processed/images.json")).toMatchSnapshot()
    },
    { timeout: 10_000 },
)
