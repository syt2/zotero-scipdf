// regex for DOI
export const doiRegexps: RegExp[] = [
  /doi[\s.:]{0,2}(10\.\d{4}[\d:.\-_/a-z]+)(?:[\s\n"<]|$)/gi,
  /(10\.\d{4}[\d:./a-z]+)(?:[\s\n"<]|$)/gi,
  /(10\.\d{4}[:.\-/a-z]+[:.\-\d]+)(?:[\s\na-z"<]|$)/gi,
  /(?:http[s]?:\/\/)+?[/\w.-]*doi[/\w.-]\/(10\.\d{4,15}\/[-._;()/:a-z0-9]+)(?:[\s\n"<]|$)/gi,
  /^(10\.\d{4,15}\/[-._;()/:A-Z0-9]+)$/gi,
];

export function matchDOIs(text: string): string[] {
  const results: string[] = [];
  for (const regexp of doiRegexps) {
    regexp.lastIndex = 0;
    let match;
    while ((match = regexp.exec(text)) !== null) {
      if (!results.includes(match[1])) {
        results.push(match[1]);
      }
    }
  }
  return results;
}
