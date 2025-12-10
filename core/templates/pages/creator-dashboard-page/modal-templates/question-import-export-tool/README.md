# Question Import/Export Tool for Oppia

A comprehensive tool for importing and exporting question sets in Oppia's creator dashboard. Supports both JSON and CSV formats with robust validation, duplicate handling, and detailed logging.

## Features

### ✅ Import Functionality
- **Multi-format Support**: Import questions from JSON or CSV files
- **Drag & Drop**: Intuitive drag-and-drop interface for file uploads
- **Schema Validation**: Strict validation against defined JSON schema
- **Preview Before Import**: Review questions in a paginated table before confirming
- **Duplicate Detection**: Automatically detects and resolves duplicate question IDs
- **Detailed Error Reporting**: Clear, actionable error messages with line numbers

### ✅ Export Functionality
- **JSON Export**: Export questions with proper formatting
- **CSV Export**: Export questions in CSV format for spreadsheet editing
- **One-Click Download**: Instant file generation and download

### ✅ Question Types Supported
- **Multiple Choice Questions (MCQ)**: With options, correct answers, and feedback
- **Numeric Questions**: With answers, tolerance, and units

### ✅ Logging & Reporting
- **Import Logs**: Detailed logs of all import operations
- **Success/Error Tracking**: Track successful imports and validation errors
- **Duplicate Resolution Logs**: See how duplicates were handled
- **Downloadable Reports**: Export logs as text files

## Installation & Setup

### Prerequisites
- Oppia development environment set up
- Node.js and npm installed
- Angular CLI

### Files Added

**Services** (in `core/templates/domain/question/`):
- `question-schema-validator.service.ts` - Schema validation logic
- `question-import.service.ts` - JSON/CSV import functionality
- `question-export.service.ts` - JSON/CSV export functionality
- `duplicate-resolution.service.ts` - Duplicate ID handling
- `import-log.service.ts` - Logging and reporting

**Components** (in `core/templates/pages/creator-dashboard-page/modal-templates/`):
- `question-import-export-modal.component.ts` - Main modal component
- `question-import-export-modal.component.html` - Modal template
- `question-import-export-modal.component.css` - Oppia-style CSS
- `question-import-export-modal.component.spec.ts` - Unit tests

**Schema & Examples** (in `core/templates/domain/question/`):
- `question-import-export-schema.json` - JSON schema definition

**Example Files** (in `core/templates/pages/creator-dashboard-page/modal-templates/question-import-export-tool/examples/`):
- `valid-questions.json` - Valid JSON example
- `valid-questions.csv` - Valid CSV example
- `invalid-questions.json` - Invalid JSON for testing

### Integration

The tool is integrated into the Creator Dashboard. To access it:

1. Navigate to the Creator Dashboard
2. Click the "Import/Export Questions" button
3. The modal will open with four tabs: Import, Export, Schema, and Logs

## Usage Guide

### Importing Questions

#### JSON Format

```json
{
  "version": "1.0.0",
  "metadata": {
    "title": "My Question Set",
    "description": "Sample questions",
    "author": "Your Name"
  },
  "questions": [
    {
      "id": "mcq_001",
      "type": "mcq",
      "question_text": "What is 2+2?",
      "difficulty": "easy",
      "tags": ["math", "arithmetic"],
      "hints": ["Think about counting"],
      "explanation": "2 plus 2 equals 4",
      "options": [
        {"id": "opt_a", "text": "3", "feedback": "Try again"},
        {"id": "opt_b", "text": "4", "feedback": "Correct!"},
        {"id": "opt_c", "text": "5", "feedback": "Not quite"}
      ],
      "correct_answer": "opt_b"
    },
    {
      "id": "numeric_001",
      "type": "numeric",
      "question_text": "What is the square root of 16?",
      "difficulty": "medium",
      "answer": 4,
      "tolerance": 0
    }
  ]
}
```

#### CSV Format

CSV files should have these headers:
```
id,type,question_text,difficulty,tags,hints,explanation,options,correct_answer,answer,tolerance,units
```

Example row:
```csv
mcq_001,mcq,"What is 2+2?",easy,math;arithmetic,"Think about counting","2+2=4","opt_a:3;opt_b:4;opt_c:5",opt_b,,,
```

**Note**: Use semicolons (`;`) to separate multiple values in tags, hints, and options.

### Exporting Questions

1. Go to the Export tab
2. Click "Export as JSON" or "Export as CSV"
3. The file will be downloaded automatically

### Viewing Schema Documentation

The Schema tab provides:
- Complete field descriptions
- Required vs optional fields
- Validation rules
- CSV format guidelines

### Checking Logs

The Logs tab shows:
- All import/export operations
- Success/error counts
- Validation errors
- Duplicate resolutions
- Download logs as text files

## Schema Reference

### Required Fields (All Questions)
- `id`: Unique identifier (alphanumeric, hyphens, underscores)
- `type`: "mcq" or "numeric"
- `question_text`: The question text

### MCQ-Specific Required Fields
- `options`: Array of at least 2 options (each with `id` and `text`)
- `correct_answer`: ID of the correct option

### Numeric-Specific Required Fields
- `answer`: The correct numeric answer

### Optional Fields
- `difficulty`: "easy", "medium", or "hard"
- `tags`: Array of tags
- `hints`: Array of hint strings
- `explanation`: Solution explanation
- `tolerance`: For numeric questions (default: 0)
- `units`: For numeric questions (e.g., "meters", "kg")

## Architecture

### Service Layer

**QuestionSchemaValidatorService**
- Validates question sets against the JSON schema
- Provides detailed error messages with field names and line numbers
- Validates MCQ and numeric question-specific fields

**QuestionImportService**
- Parses JSON and CSV files
- Converts CSV rows to question objects
- Integrates with validator service

**QuestionExportService**
- Generates JSON with proper formatting
- Converts questions to CSV format
- Creates downloadable blobs

**DuplicateResolutionService**
- Detects duplicate question IDs
- Auto-renames duplicates with counters
- Supports merge strategies

**ImportLogService**
- Logs all operations
- Tracks errors and warnings
- Generates downloadable reports

### Component Layer

**QuestionImportExportModalComponent**
- Main modal with tab navigation
- Handles file upload (drag & drop)
- Displays preview with pagination
- Manages import/export workflows

## Testing

### Running Tests

```bash
# Run all frontend tests
python -m scripts.run_frontend_tests

# Run specific service tests
python -m scripts.run_frontend_tests --test_target="QuestionSchemaValidatorService"
python -m scripts.run_frontend_tests --test_target="QuestionImportService"
python -m scripts.run_frontend_tests --test_target="QuestionExportService"

# Run component tests
python -m scripts.run_frontend_tests --test_target="QuestionImportExportModalComponent"
```

### Test Coverage

Tests cover:
- ✅ Valid question set validation
- ✅ Invalid data format handling
- ✅ Missing required fields
- ✅ MCQ-specific validation (options, correct_answer)
- ✅ Numeric-specific validation (answer, tolerance)
- ✅ Duplicate option IDs
- ✅ Invalid difficulty values
- ✅ CSV parsing with edge cases
- ✅ File upload and drag-drop
- ✅ Pagination logic
- ✅ Export functionality

## Development Guidelines

### Adding New Question Types

1. Update `question-import-export-schema.json`
2. Add validation logic in `QuestionSchemaValidatorService`
3. Update CSV parsing in `QuestionImportService`
4. Update CSV generation in `QuestionExportService`
5. Add tests for the new question type

### Code Style

- Follow Oppia's TypeScript style guide
- Use strict type checking
- Add JSDoc comments for public methods
- Keep functions focused and testable
- Use meaningful variable names

### UI/UX Guidelines

- Follow Oppia design patterns
- Use consistent color scheme (#00645c for primary)
- Ensure responsive design (mobile, tablet, desktop)
- Provide clear error messages
- Use loading indicators for async operations

## Troubleshooting

### Import Errors

**"Invalid JSON format"**
- Check that your JSON is properly formatted
- Use a JSON validator (e.g., jsonlint.com)

**"Missing required field: version"**
- Add `"version": "1.0.0"` to your JSON

**"Questions array cannot be empty"**
- Ensure you have at least one question in the array

**"MCQ questions must have at least 2 options"**
- Add more options to your MCQ question

### CSV Import Issues

**"Column count mismatch"**
- Ensure all rows have the same number of columns
- Check for missing commas or extra commas

**"Missing required CSV headers"**
- Include all required headers: `id`, `type`, `question_text`

## Future Enhancements

Potential improvements:
- Backend API integration for persistent storage
- Bulk edit functionality
- Question templates
- Import from Google Sheets
- Export to other formats (PDF, DOCX)
- Question difficulty analysis
- Tag management system

## Support

For issues or questions:
1. Check the Schema tab in the tool
2. Review example files in the `examples/` directory
3. Check the Logs tab for detailed error messages
4. Consult this README

## License

Copyright 2025 The Oppia Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0.
