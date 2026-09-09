// Consume the complete DOI token; letters are part of the suffix, not delimiters.
export const doiRegexps: RegExp[] = [
  /\b(10\.\d{4,9}\/[-._;()/:a-z0-9]+)(?=$|[\s"<>?#])/gi,
];

export function matchDOIs(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const regexp of doiRegexps) {
    regexp.lastIndex = 0;
    let match;
    while ((match = regexp.exec(text)) !== null) {
      const doi = match[1];
      if (!seen.has(doi.toLowerCase())) {
        seen.add(doi.toLowerCase());
        results.push(doi);
      }
    }
  }
  return results;
}
