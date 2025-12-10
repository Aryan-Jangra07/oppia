# Question Import/Export Tool - Architecture Documentation

## Overview

The Question Import/Export Tool is a client-side Angular application integrated into Oppia's Creator Dashboard. It provides comprehensive functionality for importing and exporting question sets with robust validation, duplicate handling, and logging capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Creator Dashboard                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Question Import/Export Modal Component              │  │
│  │                                                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │  Import  │ │  Export  │ │  Schema  │ │   Logs   │ │  │
│  │  │   Tab    │ │   Tab    │ │   Tab    │ │   Tab    │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─── File Upload (Drag & Drop)
                            ├─── Preview Table (Pagination)
                            ├─── Error Display
                            └─── Log Viewer
                            
                            ↓
                            
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Schema Validator     │  │ Import Service       │         │
│  │ - Validate structure │  │ - Parse JSON         │         │
│  │ - Check types        │  │ - Parse CSV          │         │
│  │ - Verify constraints │  │ - Transform data     │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Export Service       │  │ Duplicate Handler    │         │
│  │ - Generate JSON      │  │ - Detect duplicates  │         │
│  │ - Generate CSV       │  │ - Auto-rename        │         │
│  │ - Create downloads   │  │ - Merge strategies   │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                               │
│  ┌──────────────────────┐                                    │
│  │ Import Log Service   │                                    │
│  │ - Log operations     │                                    │
│  │ - Track errors       │                                    │
│  │ - Generate reports   │                                    │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### QuestionImportExportModalComponent

**Responsibility**: Main orchestrator for import/export workflows

**Key Features**:
- Tab-based navigation (Import, Export, Schema, Logs)
- File upload handling (drag & drop, file input)
- Preview display with pagination
- Error presentation
- Integration with all services

**State Management**:
```typescript
{
  activeTab: 'import' | 'export' | 'schema' | 'logs',
  selectedFile: File | null,
  isDragging: boolean,
  isImporting: boolean,
  importedQuestionSet: QuestionSet | null,
  validationErrors: ValidationError[],
  showPreview: boolean,
  currentPage: number,
  pageSize: number
}
```

**Key Methods**:
- `onFileSelected()` - Handle file input
- `onDrop()` - Handle drag & drop
- `importFile()` - Trigger import workflow
- `confirmImport()` - Finalize import
- `exportAsJSON()` / `exportAsCSV()` - Export workflows
- Pagination: `nextPage()`, `previousPage()`, `paginatedQuestions`

## Service Layer Architecture

### 1. QuestionSchemaValidatorService

**Purpose**: Validates question data against the defined schema

**Validation Hierarchy**:
```
QuestionSet
├── version (required, format: X.Y.Z)
├── metadata (optional)
│   ├── title
│   ├── description
│   ├── author
│   ├── created_date (ISO 8601)
│   └── tags[]
└── questions[] (required, min: 1)
    ├── Common Fields
    │   ├── id (required, pattern: [a-zA-Z0-9_-]+)
    │   ├── type (required, enum: mcq|numeric)
    │   ├── question_text (required)
    │   ├── difficulty (optional, enum: easy|medium|hard)
    │   ├── tags[] (optional)
    │   ├── hints[] (optional)
    │   └── explanation (optional)
    ├── MCQ-Specific
    │   ├── options[] (required, min: 2)
    │   │   ├── id (required)
    │   │   ├── text (required)
    │   │   └── feedback (optional)
    │   └── correct_answer (required, must reference option ID)
    └── Numeric-Specific
        ├── answer (required, type: number)
        ├── tolerance (optional, type: number, min: 0)
        └── units (optional, type: string)
```

**Key Methods**:
- `validateQuestionSet(data)` - Main validation entry point
- `validateQuestion(question, lineNumber)` - Single question validation
- `validateMCQQuestion()` - MCQ-specific validation
- `validateNumericQuestion()` - Numeric-specific validation
- `isValidVersion()` - Version format check

**Error Reporting**:
```typescript
interface ValidationError {
  field: string;           // Field name (e.g., "options", "answer")
  message: string;         // Human-readable error message
  lineNumber?: number;     // Line number in source file
  questionId?: string;     // Question ID if available
}
```

### 2. QuestionImportService

**Purpose**: Parse and import questions from files

**Workflow**:
```
File Input
    ↓
Detect Format (JSON/CSV)
    ↓
Parse Content
    ↓
Validate with SchemaValidator
    ↓
Return ImportResult
```

**JSON Import**:
1. Read file as text
2. Parse JSON
3. Validate against schema
4. Return result with validation errors

**CSV Import**:
1. Read file as text
2. Parse CSV (handle quoted values, delimiters)
3. Validate headers
4. Convert rows to QuestionData objects
5. Build QuestionSet
6. Validate against schema

**CSV Parsing Features**:
- Handles quoted values with commas
- Supports escaped quotes (`""`)
- Validates column count
- Skips empty rows
- Parses multi-value fields (tags, hints) with semicolon delimiter
- Parses complex fields (options) with custom format

**Key Methods**:
- `importFromFile(file)` - Main entry point
- `importFromJSON(file)` - JSON-specific import
- `importFromCSV(file)` - CSV-specific import
- `parseCSV(content)` - CSV parser
- `csvRowToQuestion(headers, values)` - Row converter
- `parseCSVLine(line)` - Line parser with quote handling

### 3. QuestionExportService

**Purpose**: Export questions to downloadable files

**JSON Export**:
- Formats with 2-space indentation
- Includes all fields
- Preserves structure

**CSV Export**:
- Generates header row
- Converts each question to CSV row
- Escapes values with commas/quotes
- Handles multi-value fields with semicolons
- Handles complex fields (options) with custom format

**Download Mechanism**:
1. Create Blob with content
2. Generate object URL
3. Create temporary anchor element
4. Trigger download
5. Clean up resources

**Key Methods**:
- `exportAsJSON(questionSet, filename)`
- `exportAsCSV(questionSet, filename)`
- `convertToCSV(questionSet)` - CSV converter
- `escapeCSVValue(value)` - CSV escaping
- `downloadFile(content, filename, mimeType)` - Download trigger

### 4. DuplicateResolutionService

**Purpose**: Detect and resolve duplicate question IDs

**Detection**:
- Scans all question IDs
- Counts occurrences
- Returns list of duplicates

**Resolution Strategies**:
1. **Rename**: Append counter to duplicate IDs (default)
   - `question_1`, `question_2`, etc.
2. **Skip**: Ignore duplicates
3. **Replace**: Overwrite existing questions

**Auto-Resolution Algorithm**:
```
For each question:
  If ID exists in seen set:
    Generate new ID: baseId + "_" + counter
    Increment counter until unique
    Log resolution
  Add ID to seen set
```

**Key Methods**:
- `detectDuplicates(questions)` - Find duplicates
- `autoResolveDuplicates(questions, existingIds)` - Auto-rename
- `mergeQuestions(existing, new, strategy)` - Merge with strategy
- `generateUniqueId(baseId, existingIds)` - ID generator

### 5. ImportLogService

**Purpose**: Log all import/export operations

**Log Structure**:
```typescript
interface ImportLog {
  timestamp: Date;
  filename: string;
  totalQuestions: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  validationErrors: ValidationError[];
  duplicates: DuplicateInfo[];
  status: 'success' | 'partial' | 'failed';
}
```

**Status Determination**:
- **Success**: No errors
- **Partial**: Some errors, some successes
- **Failed**: All questions failed validation

**Log Export Format**:
```
================================================================================
OPPIA QUESTION IMPORT/EXPORT LOGS
================================================================================

Timestamp: 2025-12-10T15:23:00+05:30
Filename: questions.json
Status: SUCCESS
Total Questions: 10
Successful: 10
Errors: 0
Warnings: 2

Duplicate Resolutions:
  1. mcq_001 -> mcq_001_1 (rename)
  2. numeric_001 -> numeric_001_1 (rename)

--------------------------------------------------------------------------------
```

**Key Methods**:
- `log(operation, status, message, details)` - General logging
- `logImport(filename, total, errors, duplicates)` - Import-specific
- `getLogs()` / `getImportLogs()` - Retrieve logs
- `exportLogsAsText()` - Generate text report
- `downloadLogs(filename)` - Download logs
- `clearLogs()` - Clear all logs

## Data Flow

### Import Workflow

```
1. User selects file
   ↓
2. QuestionImportExportModalComponent.importFile()
   ↓
3. QuestionImportService.importFromFile(file)
   ├─→ JSON: Parse → Validate
   └─→ CSV: Parse → Convert → Validate
   ↓
4. QuestionSchemaValidatorService.validateQuestionSet()
   ↓
5. If valid:
   ├─→ DuplicateResolutionService.detectDuplicates()
   ├─→ DuplicateResolutionService.autoResolveDuplicates()
   └─→ ImportLogService.logImport()
   ↓
6. Display preview or errors
   ↓
7. User confirms import
   ↓
8. Modal closes with question set
```

### Export Workflow

```
1. User clicks export button
   ↓
2. QuestionImportExportModalComponent.exportAsJSON/CSV()
   ↓
3. QuestionExportService.exportAsJSON/CSV(questionSet)
   ├─→ JSON: Stringify with formatting
   └─→ CSV: Convert to CSV format
   ↓
4. Create Blob and trigger download
   ↓
5. ImportLogService.log('export', 'success', ...)
```

## Design Patterns

### Dependency Injection
All services are injectable and use Angular's DI system for loose coupling and testability.

### Single Responsibility
Each service has one clear purpose:
- Validator: Validation only
- Importer: Parsing only
- Exporter: Generation only
- Duplicate Handler: Duplicate logic only
- Logger: Logging only

### Strategy Pattern
Duplicate resolution supports multiple strategies (rename, skip, replace).

### Observer Pattern
Component observes async operations (file reading, import processing).

## Error Handling

### Validation Errors
- Collected during validation
- Include field name, message, line number, question ID
- Displayed in UI with color coding

### Import Errors
- File reading errors
- JSON parsing errors
- CSV format errors
- Caught and converted to user-friendly messages

### Export Errors
- Minimal error surface (all client-side)
- Blob creation failures handled gracefully

## Performance Considerations

### Pagination
- Preview table shows 10 questions per page
- Reduces DOM size for large question sets
- Improves rendering performance

### Async Operations
- File reading is async
- Import processing shows loading indicator
- Non-blocking UI

### Memory Management
- Object URLs revoked after download
- Temporary DOM elements removed
- Logs can be cleared

## Security Considerations

### Client-Side Only
- No data sent to server
- All processing in browser
- Files never leave user's machine

### Input Validation
- Strict schema validation
- Type checking
- Format validation
- Prevents malformed data

### XSS Prevention
- Angular's built-in sanitization
- No innerHTML usage
- Template binding only

## Testing Strategy

### Unit Tests
- Each service has comprehensive test suite
- Component has integration tests
- Edge cases covered

### Test Coverage
- Valid data scenarios
- Invalid data scenarios
- Edge cases (empty, malformed, duplicates)
- Error handling
- UI interactions

## Future Enhancements

### Backend Integration
- Save imported questions to database
- Load existing questions for export
- Persistent storage

### Advanced Features
- Bulk edit
- Question templates
- Import from Google Sheets
- Export to PDF
- Question analytics

### Performance Optimizations
- Virtual scrolling for large sets
- Web Workers for parsing
- Streaming for large files

## Conclusion

The Question Import/Export Tool provides a robust, well-architected solution for managing question sets in Oppia. Its modular design, comprehensive validation, and user-friendly interface make it a valuable addition to the Creator Dashboard.
