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
 * @fileoverview Unit tests for QuestionImportExportModalComponent.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { QuestionImportExportModalComponent } from './question-import-export-modal.component';
import { QuestionImportService } from 'domain/question/question-import.service';
import { QuestionExportService } from 'domain/question/question-export.service';
import { DuplicateResolutionService } from 'domain/question/duplicate-resolution.service';
import { ImportLogService } from 'domain/question/import-log.service';
import { QuestionSchemaValidatorService } from 'domain/question/question-schema-validator.service';

describe('QuestionImportExportModalComponent', () => {
    let component: QuestionImportExportModalComponent;
    let fixture: ComponentFixture<QuestionImportExportModalComponent>;
    let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;
    let importService: QuestionImportService;
    let exportService: QuestionExportService;

    beforeEach(waitForAsync(() => {
        mockActiveModal = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);

        TestBed.configureTestingModule({
            declarations: [QuestionImportExportModalComponent],
            providers: [
                { provide: NgbActiveModal, useValue: mockActiveModal },
                QuestionImportService,
                QuestionExportService,
                DuplicateResolutionService,
                ImportLogService,
                QuestionSchemaValidatorService,
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(QuestionImportExportModalComponent);
        component = fixture.componentInstance;
        importService = TestBed.inject(QuestionImportService);
        exportService = TestBed.inject(QuestionExportService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with import tab active', () => {
        expect(component.activeTab).toBe('import');
    });

    describe('Tab navigation', () => {
        it('should switch to export tab', () => {
            component.setActiveTab('export');
            expect(component.activeTab).toBe('export');
        });

        it('should switch to schema tab', () => {
            component.setActiveTab('schema');
            expect(component.activeTab).toBe('schema');
        });

        it('should switch to logs tab', () => {
            component.setActiveTab('logs');
            expect(component.activeTab).toBe('logs');
        });
    });

    describe('File upload', () => {
        it('should handle file selection', () => {
            const file = new File(['test'], 'test.json', { type: 'application/json' });
            const event = {
                target: { files: [file] },
            } as unknown as Event;

            component.onFileSelected(event);
            expect(component.selectedFile).toBe(file);
        });

        it('should handle drag over', () => {
            const event = new DragEvent('dragover');
            spyOn(event, 'preventDefault');
            spyOn(event, 'stopPropagation');

            component.onDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(component.isDragging).toBe(true);
        });

        it('should handle drag leave', () => {
            component.isDragging = true;
            const event = new DragEvent('dragleave');
            spyOn(event, 'preventDefault');

            component.onDragLeave(event);

            expect(component.isDragging).toBe(false);
        });

        it('should handle file drop', () => {
            const file = new File(['test'], 'test.json', { type: 'application/json' });
            const event = new DragEvent('drop');
            Object.defineProperty(event, 'dataTransfer', {
                value: { files: [file] },
            });
            spyOn(event, 'preventDefault');

            component.onDrop(event);

            expect(component.selectedFile).toBe(file);
            expect(component.isDragging).toBe(false);
        });
    });

    describe('Import functionality', () => {
        it('should not import without selected file', async () => {
            component.selectedFile = null;
            await component.importFile();
            expect(component.isImporting).toBe(false);
        });

        it('should import valid file successfully', async () => {
            const file = new File(['{"version":"1.0.0","questions":[]}'], 'test.json');
            component.selectedFile = file;

            const mockResult = {
                success: true,
                questionSet: {
                    version: '1.0.0',
                    questions: [],
                },
            };

            spyOn(importService, 'importFromFile').and.returnValue(Promise.resolve(mockResult));

            await component.importFile();

            expect(component.importedQuestionSet).toEqual(mockResult.questionSet);
            expect(component.showPreview).toBe(true);
        });

        it('should handle import errors', async () => {
            const file = new File(['invalid json'], 'test.json');
            component.selectedFile = file;

            const mockResult = {
                success: false,
                errorMessage: 'Invalid JSON',
                validationResult: {
                    isValid: false,
                    errors: [{ field: 'file', message: 'Invalid JSON' }],
                },
            };

            spyOn(importService, 'importFromFile').and.returnValue(Promise.resolve(mockResult));

            await component.importFile();

            expect(component.validationErrors.length).toBeGreaterThan(0);
            expect(component.showPreview).toBe(false);
        });
    });

    describe('Pagination', () => {
        beforeEach(() => {
            const questions = [];
            for (let i = 0; i < 25; i++) {
                questions.push({
                    id: `q${i}`,
                    type: 'numeric' as const,
                    question_text: `Question ${i}`,
                    answer: i,
                });
            }
            component.importedQuestionSet = {
                version: '1.0.0',
                questions,
            };
        });

        it('should calculate total pages correctly', () => {
            expect(component.totalPages).toBe(3);
        });

        it('should paginate questions correctly', () => {
            component.currentPage = 1;
            expect(component.paginatedQuestions.length).toBe(10);
            expect(component.paginatedQuestions[0].id).toBe('q0');
        });

        it('should navigate to next page', () => {
            component.currentPage = 1;
            component.nextPage();
            expect(component.currentPage).toBe(2);
        });

        it('should not navigate beyond last page', () => {
            component.currentPage = 3;
            component.nextPage();
            expect(component.currentPage).toBe(3);
        });

        it('should navigate to previous page', () => {
            component.currentPage = 2;
            component.previousPage();
            expect(component.currentPage).toBe(1);
        });

        it('should not navigate before first page', () => {
            component.currentPage = 1;
            component.previousPage();
            expect(component.currentPage).toBe(1);
        });
    });

    describe('Export functionality', () => {
        it('should export as JSON', () => {
            spyOn(exportService, 'exportAsJSON');
            component.exportAsJSON();
            expect(exportService.exportAsJSON).toHaveBeenCalled();
        });

        it('should export as CSV', () => {
            spyOn(exportService, 'exportAsCSV');
            component.exportAsCSV();
            expect(exportService.exportAsCSV).toHaveBeenCalled();
        });
    });

    describe('Modal actions', () => {
        it('should close preview', () => {
            component.showPreview = true;
            component.closePreview();
            expect(component.showPreview).toBe(false);
        });

        it('should confirm import and close modal', () => {
            component.importedQuestionSet = {
                version: '1.0.0',
                questions: [],
            };

            component.confirmImport();

            expect(mockActiveModal.close).toHaveBeenCalledWith(component.importedQuestionSet);
        });
    });
});
