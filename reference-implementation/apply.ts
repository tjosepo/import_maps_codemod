import { isSpecial, tryURLLikeSpecifierParse } from "./utils.js";

export const apply = (
  specifier: string,
  parsedImportMap: {
    imports: Record<string, URL>;
    scopes: Record<string, Record<string, URL>>;
  },
  scriptURL: URL
): string => {
  const asURL = tryURLLikeSpecifierParse(specifier, scriptURL);
  const normalizedSpecifier = asURL ? asURL.href : specifier;
  const scriptURLString = scriptURL.href;

  for (const [scopePrefix, scopeImports] of Object.entries(
    parsedImportMap.scopes
  )) {
    if (
      scopePrefix === scriptURLString ||
      (scopePrefix.endsWith("/") && scriptURLString.startsWith(scopePrefix))
    ) {
      const scopeImportsMatch = resolveImportsMatch(
        normalizedSpecifier,
        asURL,
        scopeImports
      );
      if (scopeImportsMatch !== null) {
        return scopeImportsMatch;
      }
    }
  }

  const topLevelImportsMatch = resolveImportsMatch(
    normalizedSpecifier,
    asURL,
    parsedImportMap.imports
  );
  if (topLevelImportsMatch !== null) {
    return topLevelImportsMatch;
  }

  // The specifier was able to be turned into a URL, but wasn't remapped into anything.
  return specifier;
};

function resolveImportsMatch(
  normalizedSpecifier: string,
  asURL: URL | null,
  specifierMap: Record<string, URL>
): string | null {
  for (const [specifierKey, resolutionResult] of Object.entries(specifierMap)) {
    if (resolutionResult === null) {
      continue;
    }

    // Exact-match case
    if (resolutionResult.href === normalizedSpecifier) {
      return specifierKey;
    }

    // Package prefix-match case
    if (
      specifierKey.endsWith("/") &&
      normalizedSpecifier.startsWith(resolutionResult.href) &&
      (!asURL || isSpecial(asURL))
    ) {
      const beforePrefix = normalizedSpecifier.substring(
        resolutionResult.href.length
      );

      const specifier = specifierKey + beforePrefix;
      return specifier;
    }
  }

  return null;
}
