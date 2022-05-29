import { parse } from "std/flags/mod.ts";
import { walk } from "std/fs/mod.ts";
import { toFileUrl } from "std/path/mod.ts";
import * as recast from "recast";
import parser from "recast/parsers/typescript";

import { parseFromString } from "./reference-implementation/parser.js";
import { resolve } from "./reference-implementation/resolver.js";

if (import.meta.main) {
  const pattern = getFilePattern();
  const importMap = await tryFindImportMap();

  console.log("Processing...");

  let errors = 0;
  let unmodified = 0;
  let ok = 0;

  for await (const { path } of walk(".")) {
    if (!path.match(pattern)) continue;
    try {
      const code = await Deno.readTextFile(path);
      const result = await removeImportMap(path, code, importMap);
      if (result.modified) {
        await Deno.writeTextFile(path, result.code);
        ok++;
      } else unmodified++;
    } catch (e) {
      console.log(e);
      errors++;
    }
  }

  console.log("Done.");
  console.log(`Results: ${errors} errors ${unmodified} unmodified ${ok} ok`);
}

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

export function removeImportMap(
  specifier: string | URL,
  code: string,
  importMap: {
    imports?: {};
    scope?: {};
  }
) {
  const ast = recast.parse(code, { parser });
  let modified = false;

  recast.visit(ast, {
    visitImportDeclaration(path: any) {
      const source = path.value.source.value;
      const url = resolve(source, importMap, specifier);

      if (url.protocol === "https:" || url.protocol === "http:") {
        if (url.href !== path.value.source.value) {
          path.value.source.value = url.href;
          modified = true;
        }
      }
      this.traverse(path);
    },
  });

  return { modified, code: modified ? recast.print(ast).code : code };
}
