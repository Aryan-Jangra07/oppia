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
 * @fileoverview Component for the question import/export modal.
 */

import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { QuestionImportService } from 'domain/question/question-import.service';
import { QuestionExportService } from 'domain/question/question-export.service';
import { DuplicateResolutionService } from 'domain/question/duplicate-resolution.service';
import { ImportLogService } from 'domain/question/import-log.service';
import {
    QuestionData,
    QuestionSet,
    ValidationError,
} from 'domain/question/question-schema-validator.service';

@Component({
    selector: 'oppia-question-import-export-modal',
    templateUrl: './question-import-export-modal.component.html',
    styleUrls: ['./question-import-export-modal.component.css'],
})
export class QuestionImportExportModalComponent implements OnInit {
    activeTab: 'import' | 'export' | 'schema' | 'logs' = 'import';

    // Import state
    selectedFile: File | null = null;
    isDragging = false;
    isImporting = false;
    importedQuestionSet: QuestionSet | null = null;
    validationErrors: ValidationError[] = [];
    showPreview = false;

    // Preview pagination
    currentPage = 1;
    pageSize = 10;

    // Expanded questions tracking
    expandedQuestions: Set<string> = new Set<string>();

    // Export state
    exportQuestions: QuestionData[] = [];

    // Logs
    showLogs = false;

    constructor(
        public activeModal: NgbActiveModal,
        private importService: QuestionImportService,
        private exportService: QuestionExportService,
        private duplicateService: DuplicateResolutionService,
        public logService: ImportLogService
    ) { }

    ngOnInit(): void {
        // Export questions will be populated from imported questions
        this.exportQuestions = [];
    }

    setActiveTab(tab: 'import' | 'export' | 'schema' | 'logs'): void {
        this.activeTab = tab;
        // Update export questions when switching to export tab
        if (tab === 'export' && this.importedQuestionSet) {
            this.exportQuestions = this.importedQuestionSet.questions;
        }
    }

    // File upload handlers
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedFile = input.files[0];
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
            this.selectedFile = event.dataTransfer.files[0];
        }
    }

    async importFile(): Promise<void> {
        if (!this.selectedFile) {
            return;
        }

        this.isImporting = true;
        this.validationErrors = [];
        this.importedQuestionSet = null;

        try {
            const result = await this.importService.importFromFile(this.selectedFile);

            if (result.success && result.questionSet) {
                // Check for duplicates
                const duplicates = this.duplicateService.detectDuplicates(
                    result.questionSet.questions
                );

                if (duplicates.length > 0) {
                    // Auto-resolve duplicates
                    const resolution = this.duplicateService.autoResolveDuplicates(
                        result.questionSet.questions
                    );
                    result.questionSet.questions = resolution.questions;

                    // Log the import with duplicates
                    this.logService.logImport(
                        this.selectedFile.name,
                        result.questionSet.questions.length,
                        [],
                        resolution.duplicates
                    );
                } else {
                    this.logService.logImport(
                        this.selectedFile.name,
                        result.questionSet.questions.length,
                        [],
                        []
                    );
                }

                this.importedQuestionSet = result.questionSet;
                this.showPreview = true;
            } else {
                this.validationErrors = result.validationResult?.errors || [];

                if (result.errorMessage) {
                    this.validationErrors.unshift({
                        field: 'file',
                        message: result.errorMessage,
                    });
                }

                this.logService.logImport(
                    this.selectedFile.name,
                    0,
                    this.validationErrors,
                    []
                );
            }
        } catch (error) {
            this.validationErrors = [
                {
                    field: 'import',
                    message: `Unexpected error: ${error}`,
                },
            ];
            this.logService.log('import', 'error', `Failed to import ${this.selectedFile.name}`);
        } finally {
            this.isImporting = false;
        }
    }

    closePreview(): void {
        this.showPreview = false;
    }

    confirmImport(): void {
        if (this.importedQuestionSet) {
            // In a real implementation, this would save to the backend
            this.logService.log(
                'import',
                'success',
                `Successfully imported ${this.importedQuestionSet.questions.length} questions`
            );
            this.activeModal.close(this.importedQuestionSet);
        }
    }

    // Pagination
    get paginatedQuestions(): QuestionData[] {
        if (!this.importedQuestionSet) {
            return [];
        }
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.importedQuestionSet.questions.slice(start, end);
    }

    get totalPages(): number {
        if (!this.importedQuestionSet) {
            return 0;
        }
        return Math.ceil(this.importedQuestionSet.questions.length / this.pageSize);
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    // Export handlers
    exportAsJSON(): void {
        const questionSet: QuestionSet = {
            version: '1.0.0',
            metadata: {
                title: 'Exported Questions',
                created_date: new Date().toISOString(),
            },
            questions: this.exportQuestions,
        };

        this.exportService.exportAsJSON(questionSet);
        this.logService.log('export', 'success', `Exported ${this.exportQuestions.length} questions as JSON`);
    }

    exportAsCSV(): void {
        const questionSet: QuestionSet = {
            version: '1.0.0',
            questions: this.exportQuestions,
        };

        this.exportService.exportAsCSV(questionSet);
        this.logService.log('export', 'success', `Exported ${this.exportQuestions.length} questions as CSV`);
    }

    downloadLogs(): void {
        this.logService.downloadLogs();
    }

    clearLogs(): void {
        this.logService.clearLogs();
    }

    getErrorClass(error: ValidationError): string {
        if (error.field === 'file' || error.field === 'import') {
            return 'error-critical';
        }
        return 'error-warning';
    }

    // Get import summary statistics
    getImportSummary(): {
        total: number;
        mcqCount: number;
        numericCount: number;
        easyCount: number;
        mediumCount: number;
        hardCount: number;
        tags: string[];
    } {
        if (!this.importedQuestionSet) {
            return {
                total: 0,
                mcqCount: 0,
                numericCount: 0,
                easyCount: 0,
                mediumCount: 0,
                hardCount: 0,
                tags: [],
            };
        }

        const questions = this.importedQuestionSet.questions;
        const mcqCount = questions.filter(q => q.type === 'mcq').length;
        const numericCount = questions.filter(q => q.type === 'numeric').length;
        const easyCount = questions.filter(q => q.difficulty === 'easy').length;
        const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
        const hardCount = questions.filter(q => q.difficulty === 'hard').length;

        // Collect unique tags
        const tagSet = new Set<string>();
        questions.forEach(q => {
            if (q.tags) {
                q.tags.forEach(tag => tagSet.add(tag));
            }
        });

        return {
            total: questions.length,
            mcqCount,
            numericCount,
            easyCount,
            mediumCount,
            hardCount,
            tags: Array.from(tagSet),
        };
    }

    // Toggle question details expansion
    toggleQuestionDetails(questionId: string): void {
        if (this.expandedQuestions.has(questionId)) {
            this.expandedQuestions.delete(questionId);
        } else {
            this.expandedQuestions.add(questionId);
        }
    }

    // Check if question is expanded
    isQuestionExpanded(questionId: string): boolean {
        return this.expandedQuestions.has(questionId);
    }
}
