declare module 'pdf-extract' {
  export class PDFExtract {
    constructor();
    extractBuffer(buffer: Buffer, options: any, callback: (err: any, data: any) => void): void;
  }
}