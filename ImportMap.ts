import * as parser from "./reference-implementation/parser.js";
import * as resolver from "./reference-implementation/resolver.js";
import * as utils from "./reference-implementation/utils.js";
import * as apply from "./reference-implementation/apply.ts";
import { join, posix, toFileUrl } from "https://deno.land/std@0.141.0/path/mod.ts";

function toURL(base: string | URL) {
  if (base instanceof URL) return base;
  try {
    return new URL(base);
  } catch {
    // TODO: handle absolute URL "/"
    return toFileUrl(join(Deno.cwd(), base));
  }
}

export default class ImportMap {
  #importMap: any;
  #baseURL: URL;

  constructor(
    importMap:
      | {
        imports?: Record<string, string>;
        scope?: Record<string, Record<string, string>>;
      }
      | string,
    baseURL: string | URL = "./",
  ) {
    this.#baseURL = toURL(baseURL);
    this.#importMap = parser.parseFromString(
      typeof importMap === "string" ? importMap : JSON.stringify(importMap),
      this.#baseURL,
    );
  }

  resolve(specifier: string, referrer: string | URL): string {
    const referrerURL = toURL(referrer);
    const url = resolver.resolve(specifier, this.#importMap, referrerURL);

    // Prefer relative path, for readability
    if (url.protocol === "file:" && referrerURL.protocol === "file:") {
      const relativePath = posix.relative(
        posix.dirname(referrerURL.pathname),
        url.pathname,
      );
      if (relativePath.startsWith("../")) {
        return relativePath;
      } else {
        return "./" + relativePath;
      }
    }

    return url.href;
  }

  apply(specifier: string, referrer: string | URL): string {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      return specifier;
    }

    const referrerURL = toURL(referrer);
    const result = apply.apply(specifier, this.#importMap, referrerURL);

    const url = utils.tryURLParse(result);
    if (url && url.protocol === "file:" && referrerURL.protocol === "file:") {
      const relativePath = posix.relative(this.#baseURL.pathname, url.pathname);
      if (relativePath.startsWith("../")) {
        return relativePath;
      } else {
        return "./" + relativePath;
      }
    }

    return result;
  }
}
