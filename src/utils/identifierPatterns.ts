// Consume the complete DOI token; letters are part of the suffix, not delimiters.
//
// There is deliberately no trailing lookahead anymore. The previous version
// required the DOI to be followed by end-of-string or one of `[\s"<>?#]`, which
// turned a perfectly valid DOI into a false negative as soon as it was followed
// by sentence punctuation, e.g. "see 10.1038/foo, and ...". Instead the match is
// greedy and punctuation belonging to the surrounding prose is removed
// afterwards by `trimDOIPunctuation`.
export const doiRegexps: RegExp[] = [
  /\b(10\.\d{4,9}\/[-._;()/:a-z0-9]+)/gi,
];

/**
 * Punctuation that terminates the surrounding sentence or wraps the DOI rather
 * than being part of its suffix.
 */
const trailingPunctuation = /[.,;:'"`\]}>]+$/;

/**
 * Remove prose punctuation that the greedy match above may have swallowed.
 *
 * A closing parenthesis is only dropped while it is unbalanced, so DOIs whose
 * suffix legitimately contains parentheses (e.g.
 * `10.1002/(SICI)1099-0844(199912)15:4<251::AID-CEM534>3.0.CO;2-X`) survive.
 */
export function trimDOIPunctuation(value: string): string {
  let doi = value.replace(trailingPunctuation, "");
  while (
    doi.endsWith(")") &&
    (doi.match(/\)/g)?.length ?? 0) > (doi.match(/\(/g)?.length ?? 0)
  ) {
    doi = doi.slice(0, -1);
  }
  return doi;
}

export function matchDOIs(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const regexp of doiRegexps) {
    regexp.lastIndex = 0;
    let match;
    while ((match = regexp.exec(text)) !== null) {
      const doi = trimDOIPunctuation(match[1]);
      if (!doi) {
        continue;
      }
      if (!seen.has(doi.toLowerCase())) {
        seen.add(doi.toLowerCase());
        results.push(doi);
      }
    }
  }
  return results;
}
