import { parse } from "std/flags/mod.ts";
import { walk } from "std/fs/mod.ts";
import { toFileUrl } from "std/path/mod.ts";
import * as recast from "recast";
import parser from "recast/parsers/typescript";

import { parseFromString } from "./reference-implementation/parser.js";
import { resolve } from "./reference-implementation/resolver.js";

type ImportMap = {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
};

function getFilePattern(): RegExp {
  const {
    _: [pattern],
  } = parse(Deno.args);

  return pattern ? new RegExp(String(pattern)) : /\.[tj]sx?$/;
}

async function tryFindImportMap(): Promise<any> {
  // --import-map argument
  const { "import-map": path } = parse(Deno.args);
  if (path) {
    return parseFromString(
      await Deno.readTextFile(path),
      toFileUrl(Deno.cwd())
    );
  }

  // deno.jsonc
  try {
    const config = JSON.parse(await Deno.readTextFile("./deno.jsonc"));
    return parseFromString(
      await Deno.readTextFile(config.importMap),
      toFileUrl(Deno.cwd())
    );
  } catch {
    // not found
  }

  // deno.json
  try {
    const config = JSON.parse(await Deno.readTextFile("./deno.json"));
    return parseFromString(
      await Deno.readTextFile(config.importMap),
      toFileUrl(Deno.cwd())
    );
  } catch (e) {
    console.log(e);
    // not found
  }

  throw new Error("Could not find import map");
}

const pattern = getFilePattern();
const importMap = await tryFindImportMap();

for await (const { path } of walk(".")) {
  if (!path.match(pattern)) continue;
  removeImportMap(path, importMap);
}

async function removeImportMap(path: string, importMap: any) {
  const code = await Deno.readTextFile(path);
  const ast = recast.parse(code, { parser });

  recast.visit(ast, {
    visitImportDeclaration(path: any) {
      const specifier = path.value.source.value;
      const url = resolve(specifier, importMap, toFileUrl(Deno.cwd()));
      if (url.protocol === "https:" || url.protocol === "http:") {
        path.value.source.value = url.href;
      }
      this.traverse(path);
    },
  });

  const codeWithoutImportMap = recast.print(ast).code;
}
