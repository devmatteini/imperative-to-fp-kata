import * as Effect from "effect/Effect"
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { resizeImages } from "./resize-images"

const cli = Command.run(resizeImages, {
    name: "Resize images",
    version: "v1.0.0",
})

Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
