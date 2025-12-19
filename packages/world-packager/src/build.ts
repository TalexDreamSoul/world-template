import "bun-only";

import { compile, type JSONSchema } from "@codehz/ts-json-schema";
import type { ScriptEntrypoint } from "@miehoukingdom/world-interface";
import { getTsconfig } from "get-tsconfig";
import { resolve } from "path";
import ts from "typescript";

export default async function build(input: string, output: string) {
  const extra = getExtraOptionsType(input);
  const exports = (await import(resolve(input))) as {
    default: ScriptEntrypoint;
  };
  const banner = `//${JSON.stringify({
    name: exports.default.name,
    description: exports.default.description,
    plugins: exports.default.plugins,
    extra,
  })}`;
  const result = await Bun.build({
    entrypoints: [input],
    target: "browser",
    minify: true,
    format: "cjs",
    banner,
  });
  await Bun.write(output, result.outputs[0]!);
}

function getExtraOptionsType(input: string): JSONSchema | void {
  const tsconfig = getTsconfig(input);
  if (!tsconfig) return;
  const program = ts.createProgram(
    [input],
    tsconfig.config as ts.CompilerOptions,
  );
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(input)!;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)!;
  if (!moduleSymbol.exports) {
    throw new Error("No exports found");
  }
  const defaultExport = moduleSymbol.exports.get(ts.InternalSymbolName.Default);
  if (!defaultExport) {
    throw new Error("No default export found");
  }
  const exportType = checker.getTypeOfSymbolAtLocation(
    defaultExport,
    defaultExport.valueDeclaration!,
  );
  const symbol = exportType.getSymbol();
  if (symbol?.name !== "ScriptEntrypoint") {
    throw new Error("Default export is not a ScriptEntrypoint");
  }
  const typeArguments = (exportType as ts.TypeReference).typeArguments;
  if (!typeArguments || typeArguments.length !== 2) {
    throw new Error("Failed to get type arguments");
  }
  const InputType = checker.typeToString(typeArguments[1]!);
  if (InputType !== "void") {
    const schema = compile(typeArguments[1]!, checker);
    return schema;
  }
}
