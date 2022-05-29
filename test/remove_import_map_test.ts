import { parseFromString } from "../reference-implementation/parser.js";
import { removeImportMap } from "../mod.ts";
import { assert, assertEquals } from "std/testing/asserts.ts";
import { toFileUrl } from "std/path/mod.ts";

Deno.test("remove import map", () => {
  const input = `
    import { parse } from "std/flags/mod.ts";
    import { walk } from "std/fs/mod.ts";
    import { toFileUrl } from "std/path/mod.ts";
    import * as recast from "recast";
    import parser from "recast/parsers/typescript";

    import { parseFromString } from "./reference-implementation/parser.js";
    import { resolve } from "./reference-implementation/resolver.js";
  `;

  const importMap = parseFromString(
    `{
    "imports": {
      "recast": "https://jspm.dev/npm:recast",
      "recast/": "https://jspm.dev/npm:recast/",
      "std/": "https://deno.land/std@0.141.0/"
    }
  }`,
    toFileUrl(Deno.cwd())
  );

  const { code, modified } = removeImportMap("/example.ts", input, importMap);

  assert(modified);

  assertEquals(
    code,
    `
    import { parse } from "https://deno.land/std@0.141.0/flags/mod.ts";
    import { walk } from "https://deno.land/std@0.141.0/fs/mod.ts";
    import { toFileUrl } from "https://deno.land/std@0.141.0/path/mod.ts";
    import * as recast from "https://jspm.dev/npm:recast";
    import parser from "https://jspm.dev/npm:recast/parsers/typescript";

    import { parseFromString } from "./reference-implementation/parser.js";
    import { resolve } from "./reference-implementation/resolver.js";
  `
  );
});
