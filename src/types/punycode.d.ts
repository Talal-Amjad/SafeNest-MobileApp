// The userland punycode package (the trailing slash avoids Node's deprecated core module).
declare module "punycode/" {
  export function toASCII(domain: string): string;
  export function toUnicode(domain: string): string;
}
