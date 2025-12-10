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
 * @fileoverview Unit tests for QuestionSchemaValidatorService.
 */

import { TestBed } from '@angular/core/testing';
import { QuestionSchemaValidatorService } from './question-schema-validator.service';

describe('QuestionSchemaValidatorService', () => {
    let service: QuestionSchemaValidatorService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(QuestionSchemaValidatorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('validateQuestionSet', () => {
        it('should validate a valid question set', () => {
            const validQuestionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'What is 2+2?',
                        options: [
                            { id: 'opt_a', text: '3' },
                            { id: 'opt_b', text: '4' },
                        ],
                        correct_answer: 'opt_b',
                    },
                ],
            };

            const result = service.validateQuestionSet(validQuestionSet);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject invalid data format', () => {
            const result = service.validateQuestionSet(null);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].field).toBe('root');
        });

        it('should require version field', () => {
            const questionSet = {
                questions: [],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'version')).toBe(true);
        });

        it('should validate version format', () => {
            const questionSet = {
                version: 'invalid',
                questions: [
                    {
                        id: 'q1',
                        type: 'mcq',
                        question_text: 'Test',
                        options: [{ id: 'a', text: 'A' }],
                        correct_answer: 'a',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'version')).toBe(true);
        });

        it('should require questions array', () => {
            const questionSet = {
                version: '1.0.0',
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'questions')).toBe(true);
        });

        it('should reject empty questions array', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'questions')).toBe(true);
        });
    });

    describe('MCQ validation', () => {
        it('should validate valid MCQ question', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'Sample question?',
                        options: [
                            { id: 'opt_a', text: 'Option A' },
                            { id: 'opt_b', text: 'Option B' },
                        ],
                        correct_answer: 'opt_a',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(true);
        });

        it('should require options for MCQ', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'Sample question?',
                        correct_answer: 'opt_a',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'options')).toBe(true);
        });

        it('should require at least 2 options', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'Sample question?',
                        options: [{ id: 'opt_a', text: 'Only one option' }],
                        correct_answer: 'opt_a',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
        });

        it('should detect duplicate option IDs', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'Sample question?',
                        options: [
                            { id: 'opt_a', text: 'Option A' },
                            { id: 'opt_a', text: 'Duplicate ID' },
                        ],
                        correct_answer: 'opt_a',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
        });

        it('should validate correct_answer references valid option', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'mcq_001',
                        type: 'mcq',
                        question_text: 'Sample question?',
                        options: [
                            { id: 'opt_a', text: 'Option A' },
                            { id: 'opt_b', text: 'Option B' },
                        ],
                        correct_answer: 'opt_c',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'correct_answer')).toBe(true);
        });
    });

    describe('Numeric validation', () => {
        it('should validate valid numeric question', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'num_001',
                        type: 'numeric',
                        question_text: 'What is 2+2?',
                        answer: 4,
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(true);
        });

        it('should require answer for numeric questions', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'num_001',
                        type: 'numeric',
                        question_text: 'What is 2+2?',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'answer')).toBe(true);
        });

        it('should validate answer is a number', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'num_001',
                        type: 'numeric',
                        question_text: 'What is 2+2?',
                        answer: 'four',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'answer')).toBe(true);
        });

        it('should validate tolerance is non-negative', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'num_001',
                        type: 'numeric',
                        question_text: 'What is 2+2?',
                        answer: 4,
                        tolerance: -1,
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'tolerance')).toBe(true);
        });
    });

    describe('Common field validation', () => {
        it('should require question ID', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        type: 'numeric',
                        question_text: 'Test',
                        answer: 1,
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'id')).toBe(true);
        });

        it('should validate ID format', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'invalid id with spaces',
                        type: 'numeric',
                        question_text: 'Test',
                        answer: 1,
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'id')).toBe(true);
        });

        it('should require question_text', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'q1',
                        type: 'numeric',
                        answer: 1,
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'question_text')).toBe(true);
        });

        it('should validate difficulty values', () => {
            const questionSet = {
                version: '1.0.0',
                questions: [
                    {
                        id: 'q1',
                        type: 'numeric',
                        question_text: 'Test',
                        answer: 1,
                        difficulty: 'invalid',
                    },
                ],
            };

            const result = service.validateQuestionSet(questionSet);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'difficulty')).toBe(true);
        });
    });
});
