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
 * @fileoverview Service for exporting questions to JSON and CSV files.
 */

import { Injectable } from '@angular/core';
import { QuestionData, QuestionSet } from './question-schema-validator.service';

@Injectable({
    providedIn: 'root',
})
export class QuestionExportService {
    /**
     * Exports questions as a JSON file.
     */
    exportAsJSON(questionSet: QuestionSet, filename: string = 'questions.json'): void {
        const jsonContent = JSON.stringify(questionSet, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    /**
     * Exports questions as a CSV file.
     */
    exportAsCSV(questionSet: QuestionSet, filename: string = 'questions.csv'): void {
        const csvContent = this.convertToCSV(questionSet);
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    /**
     * Converts a QuestionSet to CSV format.
     */
    private convertToCSV(questionSet: QuestionSet): string {
        const headers = [
            'id',
            'type',
            'question_text',
            'difficulty',
            'tags',
            'hints',
            'explanation',
            'options',
            'correct_answer',
            'answer',
            'tolerance',
            'units',
        ];

        const rows: string[] = [headers.join(',')];

        questionSet.questions.forEach(question => {
            const row = headers.map(header => {
                let value = '';

                switch (header) {
                    case 'id':
                        value = question.id || '';
                        break;
                    case 'type':
                        value = question.type || '';
                        break;
                    case 'question_text':
                        value = question.question_text || '';
                        break;
                    case 'difficulty':
                        value = question.difficulty || '';
                        break;
                    case 'tags':
                        value = question.tags ? question.tags.join(';') : '';
                        break;
                    case 'hints':
                        value = question.hints ? question.hints.join(';') : '';
                        break;
                    case 'explanation':
                        value = question.explanation || '';
                        break;
                    case 'options':
                        if (question.options) {
                            value = question.options
                                .map(opt => `${opt.id}:${opt.text}`)
                                .join(';');
                        }
                        break;
                    case 'correct_answer':
                        if (question.correct_answer) {
                            value = Array.isArray(question.correct_answer)
                                ? question.correct_answer.join(';')
                                : question.correct_answer;
                        }
                        break;
                    case 'answer':
                        value = question.answer !== undefined ? String(question.answer) : '';
                        break;
                    case 'tolerance':
                        value = question.tolerance !== undefined ? String(question.tolerance) : '';
                        break;
                    case 'units':
                        value = question.units || '';
                        break;
                }

                return this.escapeCSVValue(value);
            });

            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Escapes a CSV value by wrapping it in quotes if necessary.
     */
    private escapeCSVValue(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            // Escape quotes by doubling them
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
        }
        return value;
    }

    /**
     * Triggers a file download in the browser.
     */
    private downloadFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}
