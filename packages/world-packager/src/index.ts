#!/usr/bin/env bun
import { program } from "commander";
import build from "./build.ts";

program
  .name("world-packager")
  .description("Package a world for deployment")
  .option(
    "-o, --output <path>",
    "Output path for the packaged world",
    "world.bundle.js",
  )
  .argument("<input>", "Entry file for the world to be packaged")
  .action(function (input) {
    const { output } = this.opts();
    build(input, output);
  });

program.parse();
