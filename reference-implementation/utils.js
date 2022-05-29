export const tryURLParse = (string, baseURL) => {
  try {
    return new URL(string, baseURL);
  } catch (e) {
    // TODO remove useless binding when ESLint and Jest support that
    return null;
  }
};

export const tryURLLikeSpecifierParse = (specifier, baseURL) => {
  if (
    specifier.startsWith("/") ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    return tryURLParse(specifier, baseURL);
  }

  const url = tryURLParse(specifier);
  return url;
};

// https://url.spec.whatwg.org/#special-scheme
const specialProtocols = new Set([
  "ftp:",
  "file:",
  "http:",
  "https:",
  "ws:",
  "wss:",
]);
export const isSpecial = (url) => specialProtocols.has(url.protocol);
