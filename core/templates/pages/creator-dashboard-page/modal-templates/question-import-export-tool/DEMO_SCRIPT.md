# Question Import/Export Tool - Demo Script

**Duration**: 2-3 minutes

## Introduction (15 seconds)

"Hello! Today I'll demonstrate the Question Import/Export Tool for Oppia's Creator Dashboard. This tool allows educators to efficiently manage question sets through import and export functionality with comprehensive validation and logging."

## Demo Flow

### 1. Opening the Tool (15 seconds)

1. Navigate to the Creator Dashboard
2. Click the **"Import/Export Questions"** button
3. The modal opens with four tabs: Import, Export, Schema, and Logs

"The tool provides a clean, intuitive interface integrated directly into the creator dashboard."

### 2. Schema Documentation (20 seconds)

1. Click the **Schema** tab
2. Show the documentation for MCQ and Numeric question types
3. Point out required vs optional fields
4. Show CSV format guidelines

"Before importing, let's review the schema. We support two question types: Multiple Choice and Numeric. Each has specific required fields, and we provide comprehensive documentation right in the tool."

### 3. Importing Valid Questions (45 seconds)

1. Click the **Import** tab
2. Drag and drop `valid-questions.json` onto the upload area
   - Or click "Choose File" and select the file
3. Show the selected file info (name and size)
4. Click **Import** button
5. Wait for validation (loading spinner appears)
6. Show the success message: "Successfully imported X questions!"
7. Review the preview table:
   - Question IDs
   - Question types (MCQ/Numeric badges)
   - Question text
   - Difficulty levels
   - Tags
8. Demonstrate pagination (if more than 10 questions)
9. Click **Confirm Import**

"The import process is straightforward. Simply drag and drop your file, and the tool validates it against our schema. You get an instant preview with all question details before confirming the import."

### 4. Handling Validation Errors (30 seconds)

1. Click "Choose File" and select `invalid-questions.json`
2. Click **Import**
3. Show the validation errors panel:
   - Error count displayed
   - Each error shows field name, message, and line number
   - Color-coded errors (critical vs warnings)
4. Point out specific errors:
   - "Missing required field: id"
   - "Invalid question type"
   - "MCQ without options"

"When validation fails, you get detailed, actionable error messages. Each error shows exactly which field has the problem, what's wrong, and where it occurs in your file."

### 5. Viewing Logs (20 seconds)

1. Click the **Logs** tab
2. Show the import logs:
   - Timestamp
   - Filename
   - Status badge (Success/Partial/Failed)
   - Statistics (Total, Success, Errors, Warnings)
3. Expand an error log to show details
4. Click **Download Logs** to export

"All operations are logged with detailed statistics. You can review past imports, see what went wrong, and download comprehensive reports."

### 6. Exporting Questions (15 seconds)

1. Click the **Export** tab
2. Click **Export as JSON**
   - File downloads automatically
3. Click **Export as CSV**
   - File downloads automatically

"Exporting is just as easy. One click to download your questions in either JSON or CSV format."

### 7. CSV Import Demo (20 seconds)

1. Return to **Import** tab
2. Select `valid-questions.csv`
3. Click **Import**
4. Show successful import with CSV data
5. Point out how CSV data is parsed correctly

"The tool also supports CSV files, making it easy to work with spreadsheet data. The parser handles quoted values, multiple options, and all question types."

## Conclusion (10 seconds)

"The Question Import/Export Tool provides a complete solution for managing question sets in Oppia. With robust validation, clear error messages, comprehensive logging, and support for both JSON and CSV formats, it streamlines the question management workflow for educators."

## Key Features to Highlight

✅ **Drag & Drop Upload** - Intuitive file selection  
✅ **Real-time Validation** - Instant feedback on data quality  
✅ **Preview Before Import** - Review questions before committing  
✅ **Detailed Error Messages** - Know exactly what to fix  
✅ **Duplicate Handling** - Automatic detection and resolution  
✅ **Comprehensive Logging** - Track all operations  
✅ **Multi-format Support** - JSON and CSV  
✅ **Oppia-style UI** - Consistent with platform design

## Quick Tips for Demo

- Have example files ready and easily accessible
- Show both successful and failed imports
- Emphasize the preview feature
- Highlight the error detail level
- Demonstrate pagination if possible
- Show the log download feature
- Keep the pace steady and clear

## Common Questions to Address

**Q: What happens to duplicate question IDs?**  
A: The tool automatically detects duplicates and renames them with a counter (e.g., `question_1`, `question_2`). All resolutions are logged.

**Q: Can I edit questions after import?**  
A: The preview allows you to review before confirming. After import, questions are added to your question set.

**Q: What if my CSV has errors?**  
A: You'll see detailed validation errors with line numbers. Fix the issues and re-import.

**Q: Can I export questions I've created?**  
A: Yes! The Export tab allows you to download your question sets in JSON or CSV format.
