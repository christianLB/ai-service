# Supported File Formats

## Overview

The Document Intelligence module supports a wide range of file formats for document processing and analysis. Each format has specific parsers and processing capabilities optimized for extracting content while preserving structure and meaning.

## Supported Formats

### PDF (Portable Document Format)

**Extensions**: `.pdf`

**Capabilities**:
- Text extraction with layout preservation
- Image extraction
- Form field detection
- Table extraction
- OCR for scanned documents
- Metadata extraction
- Multi-page support

**Parser Details**:
```typescript
{
  parser: 'pdf-parse',
  options: {
    max_pages: 0,        // 0 = all pages
    version: 'v2.0.0',
    ocr: {
      enabled: true,
      language: 'eng',
      dpi: 300
    },
    tables: {
      extract: true,
      format: 'json'
    }
  }
}
```

**Limitations**:
- Encrypted PDFs require password
- Complex layouts may affect extraction accuracy
- Large PDFs (>100MB) processed in chunks

### Microsoft Word (DOCX)

**Extensions**: `.docx`, `.docm`

**Capabilities**:
- Full text extraction
- Style preservation
- Header/footer extraction
- Table extraction
- Image reference extraction
- Comment extraction
- Track changes detection
- Metadata extraction

**Parser Details**:
```typescript
{
  parser: 'mammoth',
  options: {
    styleMap: [
      "p[style-name='Heading 1'] => h1",
      "p[style-name='Heading 2'] => h2"
    ],
    convertImage: mammoth.images.imgElement(function(image) {
      return image.read("base64").then(function(imageBuffer) {
        return {
          src: "data:" + image.contentType + ";base64," + imageBuffer
        };
      });
    })
  }
}
```

**Limitations**:
- Older .doc format requires conversion
- Complex formatting may be simplified
- Embedded objects limited support

### Plain Text

**Extensions**: `.txt`, `.text`, `.log`, `.md`

**Capabilities**:
- Direct text extraction
- Encoding detection
- Line break preservation
- Markdown parsing
- Code block detection

**Parser Details**:
```typescript
{
  parser: 'text-parser',
  options: {
    encoding: 'auto',    // auto-detect or specify
    preserveLineBreaks: true,
    detectMarkdown: true,
    maxSize: 10485760    // 10MB
  }
}
```

**Limitations**:
- No formatting information
- Large files may require streaming

### HTML Documents

**Extensions**: `.html`, `.htm`, `.xhtml`

**Capabilities**:
- Clean text extraction
- Structure preservation
- Link extraction
- Image reference extraction
- Metadata extraction
- JavaScript removal

**Parser Details**:
```typescript
{
  parser: 'cheerio',
  options: {
    removeScripts: true,
    removeStyles: true,
    preserveLinks: true,
    extractMetadata: true,
    cleanWhitespace: true
  }
}
```

**Limitations**:
- Dynamic content not executed
- External resources not fetched

### CSV (Comma-Separated Values)

**Extensions**: `.csv`

**Capabilities**:
- Tabular data extraction
- Header detection
- Data type inference
- Statistics generation
- Large file streaming

**Parser Details**:
```typescript
{
  parser: 'csv-parse',
  options: {
    delimiter: 'auto',   // auto-detect
    headers: true,
    skipEmptyLines: true,
    maxRows: 1000000,
    encoding: 'utf-8'
  }
}
```

**Special Features**:
- Automatic summary statistics
- Column analysis
- Data quality reporting

### Excel Spreadsheets

**Extensions**: `.xlsx`, `.xlsm`

**Capabilities**:
- Multi-sheet support
- Formula evaluation
- Cell formatting preservation
- Chart detection
- Named range extraction

**Parser Details**:
```typescript
{
  parser: 'xlsx',
  options: {
    sheets: 'all',       // or specific sheet names
    header: 1,           // row with headers
    raw: false,          // format values
    dateNF: 'yyyy-mm-dd',
    formulae: true
  }
}
```

**Limitations**:
- Macros not executed
- Complex formulas simplified
- Very large files need streaming

### Markdown

**Extensions**: `.md`, `.markdown`

**Capabilities**:
- Structure preservation
- Code block extraction
- Link extraction
- Table parsing
- Front matter support

**Parser Details**:
```typescript
{
  parser: 'markdown-parser',
  options: {
    gfm: true,           // GitHub Flavored Markdown
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
  }
}
```

## File Processing Pipeline

### 1. Format Detection

```typescript
function detectFileFormat(file: Buffer, filename: string): FileFormat {
  // Check magic bytes
  const magicBytes = file.slice(0, 8);
  
  // PDF: %PDF
  if (magicBytes.toString().startsWith('%PDF')) {
    return 'pdf';
  }
  
  // DOCX: PK (ZIP archive)
  if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) {
    return 'docx';
  }
  
  // Fallback to extension
  const ext = path.extname(filename).toLowerCase();
  return formatMap[ext] || 'unknown';
}
```

### 2. Parser Selection

```typescript
interface ParserConfig {
  pdf: PDFParser;
  docx: DocxParser;
  txt: TextParser;
  html: HTMLParser;
  csv: CSVParser;
  xlsx: ExcelParser;
  md: MarkdownParser;
}

function selectParser(format: FileFormat): Parser {
  return parserConfig[format] || defaultParser;
}
```

### 3. Content Extraction

```typescript
interface ExtractedContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount?: number;
    wordCount?: number;
  };
  structure: {
    headings: Heading[];
    paragraphs: Paragraph[];
    tables: Table[];
    lists: List[];
  };
  media: {
    images: Image[];
    links: Link[];
  };
}
```

## Format-Specific Features

### PDF Advanced Features

**OCR Processing**:
```typescript
async function processScannedPDF(file: Buffer): Promise<string> {
  const images = await pdf.extractImages(file);
  const texts = await Promise.all(
    images.map(img => tesseract.recognize(img, 'eng'))
  );
  return texts.join('\n');
}
```

**Form Field Extraction**:
```typescript
interface PDFForm {
  fields: {
    name: string;
    type: 'text' | 'checkbox' | 'radio' | 'dropdown';
    value: any;
    required: boolean;
  }[];
}
```

### Excel Advanced Features

**Data Analysis**:
```typescript
interface ExcelAnalysis {
  sheets: {
    name: string;
    rowCount: number;
    columnCount: number;
    dataTypes: Map<string, DataType>;
    summary: {
      numeric: Statistics;
      dates: DateRange;
      text: TextAnalysis;
    };
  }[];
}
```

### CSV Advanced Features

**Auto-Detection**:
```typescript
function detectCSVFormat(sample: string): CSVFormat {
  const delimiters = [',', ';', '\t', '|'];
  const scores = delimiters.map(d => ({
    delimiter: d,
    score: countOccurrences(sample, d)
  }));
  return scores.sort((a, b) => b.score - a.score)[0];
}
```

## Format Conversion

### Conversion Matrix

| From | To | Quality | Method |
|------|----|---------|---------|
| DOCX | PDF | High | LibreOffice |
| PDF | TXT | Medium | pdf-parse + OCR |
| HTML | PDF | High | Puppeteer |
| MD | HTML | High | marked |
| XLSX | CSV | High | Native |

### Conversion Pipeline

```typescript
async function convertDocument(
  file: Buffer,
  fromFormat: Format,
  toFormat: Format
): Promise<Buffer> {
  const converter = getConverter(fromFormat, toFormat);
  if (!converter) {
    throw new Error(`No converter from ${fromFormat} to ${toFormat}`);
  }
  
  return await converter.convert(file, {
    quality: 'high',
    preserveFormatting: true
  });
}
```

## Size Limitations

### Default Limits

```typescript
const SIZE_LIMITS = {
  pdf: 52428800,      // 50MB
  docx: 26214400,     // 25MB
  txt: 10485760,      // 10MB
  html: 10485760,     // 10MB
  csv: 104857600,     // 100MB
  xlsx: 52428800,     // 50MB
  md: 10485760        // 10MB
};
```

### Large File Handling

For files exceeding limits:

```typescript
interface StreamingOptions {
  chunkSize: number;
  onProgress: (progress: number) => void;
  onChunk: (chunk: ProcessedChunk) => void;
}

async function processLargeFile(
  filePath: string,
  options: StreamingOptions
): Promise<void> {
  const stream = fs.createReadStream(filePath, {
    highWaterMark: options.chunkSize
  });
  
  stream.on('data', async (chunk) => {
    const processed = await processChunk(chunk);
    options.onChunk(processed);
  });
}
```

## Error Handling

### Common Format Errors

```typescript
enum FormatError {
  UNSUPPORTED_FORMAT = 'File format not supported',
  CORRUPTED_FILE = 'File appears to be corrupted',
  PASSWORD_PROTECTED = 'File is password protected',
  ENCODING_ERROR = 'Unable to detect file encoding',
  SIZE_EXCEEDED = 'File size exceeds maximum allowed'
}
```

### Error Recovery

```typescript
async function parseWithFallback(
  file: Buffer,
  format: Format
): Promise<ExtractedContent> {
  try {
    return await primaryParser.parse(file);
  } catch (error) {
    console.warn('Primary parser failed, trying fallback');
    
    if (format === 'pdf' && error.code === 'ENCRYPTED') {
      return await parseEncryptedPDF(file);
    }
    
    if (format === 'docx') {
      // Try converting to HTML first
      const html = await convertToHTML(file);
      return await parseHTML(html);
    }
    
    // Last resort: extract any text possible
    return await extractRawText(file);
  }
}
```

## Best Practices

### 1. Format Validation
Always validate format before processing:
```typescript
function validateFormat(file: Express.Multer.File): boolean {
  const validFormats = Object.keys(SIZE_LIMITS);
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  return validFormats.includes(ext) && file.size <= SIZE_LIMITS[ext];
}
```

### 2. Content Sanitization
Clean extracted content:
```typescript
function sanitizeContent(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .replace(/\r\n/g, '\n')  // Normalize line breaks
    .trim();
}
```

### 3. Metadata Preservation
Always extract and store metadata:
```typescript
interface DocumentMetadata {
  format: Format;
  originalName: string;
  size: number;
  hash: string;
  extracted: {
    title?: string;
    author?: string;
    created?: Date;
    modified?: Date;
    generator?: string;
  };
}
```

## Future Format Support

### Planned Formats
- **Images**: JPG, PNG with OCR
- **Email**: EML, MSG files
- **Archives**: ZIP, RAR with nested document support
- **CAD**: DWG, DXF basic text extraction
- **eBooks**: EPUB, MOBI

### Format Request Process
To request support for a new format:
1. Check if parser exists in npm
2. Evaluate extraction quality
3. Test with sample files
4. Add to processing pipeline