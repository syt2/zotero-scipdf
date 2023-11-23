// regex for DOI
export const doiRegexps: Readonly<RegExp>[] = [
  /doi[\s.:]{0,2}(10\.\d{4}[\d:.\-_/a-z]+)(?:[\s\n"<]|$)/gi,
  /(10\.\d{4}[\d:./a-z]+)(?:[\s\n"<]|$)/gi,
  /(10\.\d{4}[:.\-/a-z]+[:.\-\d]+)(?:[\s\na-z"<]|$)/gi,
  /(?:http[s]?:\/\/)+?[/\w.-]*doi[/\w.-]\/(10\.\d{4,15}\/[-._;()/:a-z0-9]+)(?:[\s\n"<]|$)/gi,
  /^(10\.\d{4,15}\/[-._;()/:A-Z0-9]+)$/gi,
];

// regex for ArXiv
export const arxivRegexps: Readonly<RegExp>[] = [
  /arxiv\s*:[\s]*(\d{4}\.\d+)(?:v\d+)?(?:[\s\n"<]|$)/gi,
  /(\d{4}\.\d+)(?:v\d+)?(?:\.pdf)/gi,
  /^(\d{4}\.\d+)(?:v\d+)?$/gi,
  /(?:http[s]?:\/\/)+?[/\w.-]*arxiv[/\w.-]*(\d{4}\.\d+)(?:v\d+)?(?:[\s\n"<]|$)/gi,
];

export const Arxiv2007Pattern: Readonly<RegExp> = /(\d{4}\.\d+)(?:v\d+)?/gi;
export const DOIPattern: Readonly<RegExp> = /10\.\d{4,15}\/[-._;()/:A-Z0-9]+/gi;
