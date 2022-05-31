import { parse } from "std/flags/mod.ts";
import { walk } from "std/fs/mod.ts";
import * as recast from "recast";
import parser from "recast/parsers/typescript";

import ImportMap from "./ImportMap.ts";

if (import.meta.main) {
  const addOrRemove = getAddOrRemove();
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
      const result = (await (addOrRemove === "add"))
        ? applyImportMap(path, code, importMap)
        : removeImportMap(path, code, importMap);
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

function getAddOrRemove(): "add" | "remove" {
  const {
    _: [addOrRemove],
  } = parse(Deno.args);
  if (!addOrRemove || (addOrRemove !== "add" && addOrRemove !== "remove")) {
    throw "Select one of two options: 'add' or 'remove'";
  }
  return addOrRemove;
}

function getFilePattern(): RegExp {
  const {
    _: [, pattern],
  } = parse(Deno.args);

  return pattern ? new RegExp(String(pattern)) : /\.[tj]sx?$/;
}

async function tryFindImportMap(): Promise<ImportMap> {
  // --import-map argument
  const { "import-map": path } = parse(Deno.args);
  if (path) {
    return new ImportMap(await Deno.readTextFile(path));
  }

  // deno.jsonc
  try {
    const config = JSON.parse(await Deno.readTextFile("./deno.jsonc"));
    return new ImportMap(await Deno.readTextFile(config.importMap));
  } catch {
    // not found
  }

  // deno.json
  try {
    const config = JSON.parse(await Deno.readTextFile("./deno.json"));
    return new ImportMap(await Deno.readTextFile(config.importMap));
  } catch {
    // not found
  }

  throw new Error("Could not find import map");
}

export function removeImportMap(
  referrer: string,
  code: string,
  importMap: ImportMap
) {
  const ast = recast.parse(code, { parser });
  let modified = false;

  recast.visit(ast, {
    visitImportDeclaration(path: any) {
      const source = path.value.source.value;
      const url = importMap.resolve(source, referrer);

      if (url !== source) {
        path.value.source.value = url;
        modified = true;
      }

      this.traverse(path);
    },
  });

  return { modified, code: modified ? recast.print(ast).code : code };
}

export function applyImportMap(
  referrer: string,
  code: string,
  importMap: ImportMap
) {
  const ast = recast.parse(code, { parser });
  let modified = false;

  recast.visit(ast, {
    visitImportDeclaration(path: any) {
      const source = path.value.source.value;
      const url = importMap.apply(source, referrer);

      if (url !== source) {
        path.value.source.value = url;
        modified = true;
      }

      this.traverse(path);
    },
  });

  return { modified, code: modified ? recast.print(ast).code : code };
}
