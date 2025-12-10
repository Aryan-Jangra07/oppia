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
 * @fileoverview Service for logging import/export operations.
 */

import { Injectable } from '@angular/core';
import { ValidationError } from './question-schema-validator.service';
import { DuplicateInfo } from './duplicate-resolution.service';

export interface LogEntry {
    timestamp: Date;
    operation: 'import' | 'export';
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: string;
}

export interface ImportLog {
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

@Injectable({
    providedIn: 'root',
})
export class ImportLogService {
    private logs: LogEntry[] = [];
    private importLogs: ImportLog[] = [];

    /**
     * Logs an operation.
     */
    log(
        operation: 'import' | 'export',
        status: 'success' | 'error' | 'warning',
        message: string,
        details?: string
    ): void {
        this.logs.push({
            timestamp: new Date(),
            operation,
            status,
            message,
            details,
        });
    }

    /**
     * Logs an import operation with detailed results.
     */
    logImport(
        filename: string,
        totalQuestions: number,
        validationErrors: ValidationError[],
        duplicates: DuplicateInfo[]
    ): void {
        const errorCount = validationErrors.length;
        const warningCount = duplicates.length;
        const successCount = totalQuestions - errorCount;

        let status: 'success' | 'partial' | 'failed';
        if (errorCount === 0) {
            status = 'success';
        } else if (successCount > 0) {
            status = 'partial';
        } else {
            status = 'failed';
        }

        this.importLogs.push({
            timestamp: new Date(),
            filename,
            totalQuestions,
            successCount,
            errorCount,
            warningCount,
            validationErrors,
            duplicates,
            status,
        });

        // Also add to general logs
        this.log(
            'import',
            status === 'success' ? 'success' : status === 'failed' ? 'error' : 'warning',
            `Imported ${filename}: ${successCount}/${totalQuestions} questions successful`,
            `Errors: ${errorCount}, Warnings: ${warningCount}`
        );
    }

    /**
     * Gets all logs.
     */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Gets all import logs.
     */
    getImportLogs(): ImportLog[] {
        return [...this.importLogs];
    }

    /**
     * Gets the most recent import log.
     */
    getLatestImportLog(): ImportLog | undefined {
        return this.importLogs[this.importLogs.length - 1];
    }

    /**
     * Clears all logs.
     */
    clearLogs(): void {
        this.logs = [];
        this.importLogs = [];
    }

    /**
     * Exports logs as a text file.
     */
    exportLogsAsText(): string {
        const lines: string[] = [
            '='.repeat(80),
            'OPPIA QUESTION IMPORT/EXPORT LOGS',
            '='.repeat(80),
            '',
        ];

        this.importLogs.forEach(log => {
            lines.push(`Timestamp: ${log.timestamp.toISOString()}`);
            lines.push(`Filename: ${log.filename}`);
            lines.push(`Status: ${log.status.toUpperCase()}`);
            lines.push(`Total Questions: ${log.totalQuestions}`);
            lines.push(`Successful: ${log.successCount}`);
            lines.push(`Errors: ${log.errorCount}`);
            lines.push(`Warnings: ${log.warningCount}`);
            lines.push('');

            if (log.validationErrors.length > 0) {
                lines.push('Validation Errors:');
                log.validationErrors.forEach((error, index) => {
                    lines.push(`  ${index + 1}. [${error.field}] ${error.message}`);
                    if (error.questionId) {
                        lines.push(`     Question ID: ${error.questionId}`);
                    }
                    if (error.lineNumber) {
                        lines.push(`     Line: ${error.lineNumber}`);
                    }
                });
                lines.push('');
            }

            if (log.duplicates.length > 0) {
                lines.push('Duplicate Resolutions:');
                log.duplicates.forEach((dup, index) => {
                    lines.push(
                        `  ${index + 1}. ${dup.originalId} -> ${dup.newId} (${dup.action})`
                    );
                });
                lines.push('');
            }

            lines.push('-'.repeat(80));
            lines.push('');
        });

        return lines.join('\n');
    }

    /**
     * Downloads logs as a text file.
     */
    downloadLogs(filename: string = 'import-export-logs.txt'): void {
        const content = this.exportLogsAsText();
        const blob = new Blob([content], { type: 'text/plain' });
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
