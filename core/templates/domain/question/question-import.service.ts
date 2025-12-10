// Copyright 2025 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Service for importing questions from JSON and CSV files.
 */

import { Injectable } from '@angular/core';
import {
    QuestionData,
    QuestionSet,
    QuestionSchemaValidatorService,
    ValidationResult,
} from './question-schema-validator.service';

export interface ImportResult {
    success: boolean;
    questionSet?: QuestionSet;
    validationResult?: ValidationResult;
    errorMessage?: string;
}

@Injectable({
    providedIn: 'root',
})
export class QuestionImportService {
    constructor(
        private schemaValidator: QuestionSchemaValidatorService
    ) { }

    /**
     * Imports questions from a file.
     */
    async importFromFile(file: File): Promise<ImportResult> {
        const fileExtension = this.getFileExtension(file.name);

        try {
            if (fileExtension === 'json') {
                return await this.importFromJSON(file);
            } else if (fileExtension === 'csv') {
                return await this.importFromCSV(file);
            } else {
                return {
                    success: false,
                    errorMessage: `Unsupported file format: ${fileExtension}. Please use JSON or CSV.`,
                };
            }
        } catch (error) {
            return {
                success: false,
                errorMessage: `Error reading file: ${error}`,
            };
        }
    }

    /**
     * Imports questions from a JSON file.
     */
    private async importFromJSON(file: File): Promise<ImportResult> {
        try {
            const content = await this.readFileAsText(file);
            const data = JSON.parse(content);

            const validationResult = this.schemaValidator.validateQuestionSet(data);

            return {
                success: validationResult.isValid,
                questionSet: validationResult.isValid ? (data as QuestionSet) : undefined,
                validationResult,
            };
        } catch (error) {
            return {
                success: false,
                errorMessage: `Invalid JSON format: ${error}`,
            };
        }
    }

    /**
     * Imports questions from a CSV file.
     */
    private async importFromCSV(file: File): Promise<ImportResult> {
        try {
            const content = await this.readFileAsText(file);
            const questionSet = this.parseCSV(content);

            const validationResult = this.schemaValidator.validateQuestionSet(questionSet);

            return {
                success: validationResult.isValid,
                questionSet: validationResult.isValid ? questionSet : undefined,
                validationResult,
            };
        } catch (error) {
            return {
                success: false,
                errorMessage: `Error parsing CSV: ${error}`,
            };
        }
    }

    /**
     * Parses CSV content into a QuestionSet.
     */
    private parseCSV(content: string): QuestionSet {
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
        }

        const headers = this.parseCSVLine(lines[0]);
        const questions: QuestionData[] = [];

        // Validate required headers
        const requiredHeaders = ['id', 'type', 'question_text'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
        }

        // Parse each data row
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);

            if (values.length === 0 || values.every(v => v.trim() === '')) {
                // Skip empty rows
                continue;
            }

            if (values.length !== headers.length) {
                throw new Error(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
            }

            const question = this.csvRowToQuestion(headers, values);
            questions.push(question);
        }

        return {
            version: '1.0.0',
            questions,
        };
    }

    /**
     * Converts a CSV row to a QuestionData object.
     */
    private csvRowToQuestion(headers: string[], values: string[]): QuestionData {
        const question: Partial<QuestionData> = {};

        headers.forEach((header, index) => {
            const value = values[index].trim();

            if (value === '') {
                return; // Skip empty values
            }

            switch (header) {
                case 'id':
                    question.id = value;
                    break;
                case 'type':
                    question.type = value as 'mcq' | 'numeric';
                    break;
                case 'question_text':
                    question.question_text = value;
                    break;
                case 'difficulty':
                    question.difficulty = value as 'easy' | 'medium' | 'hard';
                    break;
                case 'tags':
                    question.tags = value.split(';').map(t => t.trim());
                    break;
                case 'hints':
                    question.hints = value.split(';').map(h => h.trim());
                    break;
                case 'explanation':
                    question.explanation = value;
                    break;
                case 'options':
                    // Format: "id1:text1;id2:text2;..."
                    question.options = value.split(';').map(opt => {
                        const [id, text] = opt.split(':').map(s => s.trim());
                        return { id, text };
                    });
                    break;
                case 'correct_answer':
                    // Support multiple answers separated by semicolon
                    if (value.includes(';')) {
                        question.correct_answer = value.split(';').map(a => a.trim());
                    } else {
                        question.correct_answer = value;
                    }
                    break;
                case 'answer':
                    question.answer = parseFloat(value);
                    break;
                case 'tolerance':
                    question.tolerance = parseFloat(value);
                    break;
                case 'units':
                    question.units = value;
                    break;
            }
        });

        return question as QuestionData;
    }

    /**
     * Parses a single CSV line, handling quoted values.
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Reads a file as text.
     */
    private readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    /**
     * Gets the file extension.
     */
    private getFileExtension(filename: string): string {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    }
}
