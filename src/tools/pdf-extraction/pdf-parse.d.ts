declare module 'pdf-parse/lib/pdf-parse.js' {
  interface ParsedPdfData {
    text: string;
    numpages: number;
    info?: {
      Title?: string;
      Author?: string;
      Creator?: string;
    };
  }

  function parse(buffer: Buffer): Promise<ParsedPdfData>;
  export = parse;
}

