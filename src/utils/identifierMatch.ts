import { arxivRegexps, doiRegexps } from "./identifierPatterns";

// Identifier Source ArXiv / DOI
export enum Source {
  Arxiv,
  Doi,
}

// get regex matched identifiers from texts
export function matchedIdentifiers(
  texts: string | string[],
  sources: Source[] | Source = [Source.Arxiv, Source.Doi],
): Record<Source, string[]> {
  if (!Array.isArray(sources)) {
    sources = [sources];
  }
  if (!Array.isArray(texts)) {
    texts = [texts];
  }
  const result: Record<Source, string[]> = {
    [Source.Arxiv]: [],
    [Source.Doi]: [],
  };

  for (const text of texts) {
    if (typeof text !== "string") {
      continue;
    }
    if (sources.includes(Source.Arxiv)) {
      for (const arxivRegexp of arxivRegexps) {
        try {
          let match;
          while ((match = arxivRegexp.exec(text)) !== null) {
            if (result[Source.Arxiv].includes(match[1])) {
              continue;
            }
            result[Source.Arxiv].push(match[1]);
          }
        } catch {
          // Handle the error if needed
        }
      }
    }
    if (sources.includes(Source.Doi)) {
      for (const doiRegexp of doiRegexps) {
        try {
          let match;
          while ((match = doiRegexp.exec(text)) !== null) {
            if (result[Source.Doi].includes(match[1])) {
              continue;
            }
            result[Source.Doi].push(match[1]);
          }
        } catch {
          // Handle the error if needed
        }
      }
    }
  }
  return result;
}
