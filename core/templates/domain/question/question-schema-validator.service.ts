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
 * @fileoverview Service for validating question import data against schema.
 */

import { Injectable } from '@angular/core';

export interface ValidationError {
    field: string;
    message: string;
    lineNumber?: number;
    questionId?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface QuestionData {
    id: string;
    type: 'mcq' | 'numeric';
    question_text: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    hints?: string[];
    explanation?: string;
    options?: Array<{
        id: string;
        text: string;
        feedback?: string;
    }>;
    correct_answer?: string | string[];
    answer?: number;
    tolerance?: number;
    units?: string;
}

export interface QuestionSet {
    version: string;
    metadata?: {
        title?: string;
        description?: string;
        author?: string;
        created_date?: string;
        tags?: string[];
    };
    questions: QuestionData[];
}

@Injectable({
    providedIn: 'root',
})
export class QuestionSchemaValidatorService {
    private readonly SCHEMA_VERSION = '1.0.0';
    private readonly VALID_QUESTION_TYPES = ['mcq', 'numeric'];
    private readonly VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
    private readonly ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

    /**
     * Validates a complete question set against the schema.
     */
    validateQuestionSet(data: unknown): ValidationResult {
        const errors: ValidationError[] = [];

        // Check if data is an object
        if (!data || typeof data !== 'object') {
            errors.push({
                field: 'root',
                message: 'Invalid data format. Expected a JSON object.',
            });
            return { isValid: false, errors };
        }

        const questionSet = data as Partial<QuestionSet>;

        // Validate version
        if (!questionSet.version) {
            errors.push({
                field: 'version',
                message: 'Missing required field: version',
            });
        } else if (!this.isValidVersion(questionSet.version)) {
            errors.push({
                field: 'version',
                message: `Invalid version format. Expected format: X.Y.Z (e.g., ${this.SCHEMA_VERSION})`,
            });
        }

        // Validate questions array
        if (!questionSet.questions) {
            errors.push({
                field: 'questions',
                message: 'Missing required field: questions',
            });
            return { isValid: false, errors };
        }

        if (!Array.isArray(questionSet.questions)) {
            errors.push({
                field: 'questions',
                message: 'Questions must be an array',
            });
            return { isValid: false, errors };
        }

        if (questionSet.questions.length === 0) {
            errors.push({
                field: 'questions',
                message: 'Questions array cannot be empty',
            });
            return { isValid: false, errors };
        }

        // Validate each question
        questionSet.questions.forEach((question, index) => {
            const questionErrors = this.validateQuestion(question, index + 1);
            errors.push(...questionErrors);
        });

        // Validate metadata if present
        if (questionSet.metadata) {
            const metadataErrors = this.validateMetadata(questionSet.metadata);
            errors.push(...metadataErrors);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validates a single question.
     */
    private validateQuestion(
        question: unknown,
        lineNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!question || typeof question !== 'object') {
            errors.push({
                field: `questions[${lineNumber - 1}]`,
                message: 'Question must be an object',
                lineNumber,
            });
            return errors;
        }

        const q = question as Partial<QuestionData>;

        // Validate required fields
        if (!q.id) {
            errors.push({
                field: 'id',
                message: 'Missing required field: id',
                lineNumber,
            });
        } else if (!this.ID_PATTERN.test(q.id)) {
            errors.push({
                field: 'id',
                message:
                    'Invalid ID format. Use only letters, numbers, hyphens, and underscores.',
                lineNumber,
                questionId: q.id,
            });
        }

        if (!q.type) {
            errors.push({
                field: 'type',
                message: 'Missing required field: type',
                lineNumber,
                questionId: q.id,
            });
        } else if (!this.VALID_QUESTION_TYPES.includes(q.type)) {
            errors.push({
                field: 'type',
                message: `Invalid question type: ${q.type}. Must be one of: ${this.VALID_QUESTION_TYPES.join(', ')}`,
                lineNumber,
                questionId: q.id,
            });
        }

        if (!q.question_text) {
            errors.push({
                field: 'question_text',
                message: 'Missing required field: question_text',
                lineNumber,
                questionId: q.id,
            });
        } else if (typeof q.question_text !== 'string' || q.question_text.trim().length === 0) {
            errors.push({
                field: 'question_text',
                message: 'Question text cannot be empty',
                lineNumber,
                questionId: q.id,
            });
        }

        // Validate optional fields
        if (q.difficulty && !this.VALID_DIFFICULTIES.includes(q.difficulty)) {
            errors.push({
                field: 'difficulty',
                message: `Invalid difficulty: ${q.difficulty}. Must be one of: ${this.VALID_DIFFICULTIES.join(', ')}`,
                lineNumber,
                questionId: q.id,
            });
        }

        if (q.tags && !Array.isArray(q.tags)) {
            errors.push({
                field: 'tags',
                message: 'Tags must be an array',
                lineNumber,
                questionId: q.id,
            });
        }

        if (q.hints && !Array.isArray(q.hints)) {
            errors.push({
                field: 'hints',
                message: 'Hints must be an array',
                lineNumber,
                questionId: q.id,
            });
        }

        // Type-specific validation
        if (q.type === 'mcq') {
            errors.push(...this.validateMCQQuestion(q, lineNumber));
        } else if (q.type === 'numeric') {
            errors.push(...this.validateNumericQuestion(q, lineNumber));
        }

        return errors;
    }

    /**
     * Validates MCQ-specific fields.
     */
    private validateMCQQuestion(
        question: Partial<QuestionData>,
        lineNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!question.options) {
            errors.push({
                field: 'options',
                message: 'MCQ questions must have options',
                lineNumber,
                questionId: question.id,
            });
            return errors;
        }

        if (!Array.isArray(question.options)) {
            errors.push({
                field: 'options',
                message: 'Options must be an array',
                lineNumber,
                questionId: question.id,
            });
            return errors;
        }

        if (question.options.length < 2) {
            errors.push({
                field: 'options',
                message: 'MCQ questions must have at least 2 options',
                lineNumber,
                questionId: question.id,
            });
        }

        // Validate each option
        const optionIds = new Set<string>();
        question.options.forEach((option, index) => {
            if (!option.id) {
                errors.push({
                    field: `options[${index}].id`,
                    message: 'Option missing required field: id',
                    lineNumber,
                    questionId: question.id,
                });
            } else {
                if (optionIds.has(option.id)) {
                    errors.push({
                        field: `options[${index}].id`,
                        message: `Duplicate option ID: ${option.id}`,
                        lineNumber,
                        questionId: question.id,
                    });
                }
                optionIds.add(option.id);
            }

            if (!option.text) {
                errors.push({
                    field: `options[${index}].text`,
                    message: 'Option missing required field: text',
                    lineNumber,
                    questionId: question.id,
                });
            }
        });

        if (!question.correct_answer) {
            errors.push({
                field: 'correct_answer',
                message: 'MCQ questions must have a correct_answer',
                lineNumber,
                questionId: question.id,
            });
        } else {
            // Validate correct_answer references valid option IDs
            const correctAnswers = Array.isArray(question.correct_answer)
                ? question.correct_answer
                : [question.correct_answer];

            correctAnswers.forEach(answerId => {
                if (!optionIds.has(answerId)) {
                    errors.push({
                        field: 'correct_answer',
                        message: `Correct answer references non-existent option ID: ${answerId}`,
                        lineNumber,
                        questionId: question.id,
                    });
                }
            });
        }

        return errors;
    }

    /**
     * Validates numeric question-specific fields.
     */
    private validateNumericQuestion(
        question: Partial<QuestionData>,
        lineNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        if (question.answer === undefined || question.answer === null) {
            errors.push({
                field: 'answer',
                message: 'Numeric questions must have an answer',
                lineNumber,
                questionId: question.id,
            });
        } else if (typeof question.answer !== 'number') {
            errors.push({
                field: 'answer',
                message: 'Answer must be a number',
                lineNumber,
                questionId: question.id,
            });
        }

        if (
            question.tolerance !== undefined &&
            typeof question.tolerance !== 'number'
        ) {
            errors.push({
                field: 'tolerance',
                message: 'Tolerance must be a number',
                lineNumber,
                questionId: question.id,
            });
        }

        if (
            question.tolerance !== undefined &&
            question.tolerance < 0
        ) {
            errors.push({
                field: 'tolerance',
                message: 'Tolerance must be non-negative',
                lineNumber,
                questionId: question.id,
            });
        }

        return errors;
    }

    /**
     * Validates metadata fields.
     */
    private validateMetadata(
        metadata: Partial<QuestionSet['metadata']>
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        if (metadata.tags && !Array.isArray(metadata.tags)) {
            errors.push({
                field: 'metadata.tags',
                message: 'Metadata tags must be an array',
            });
        }

        if (metadata.created_date) {
            const date = new Date(metadata.created_date);
            if (isNaN(date.getTime())) {
                errors.push({
                    field: 'metadata.created_date',
                    message: 'Invalid date format. Use ISO 8601 format.',
                });
            }
        }

        return errors;
    }

    /**
     * Validates version string format.
     */
    private isValidVersion(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }

    /**
     * Checks if a question set is compatible with current schema version.
     */
    isCompatibleVersion(version: string): boolean {
        const [major] = version.split('.');
        const [currentMajor] = this.SCHEMA_VERSION.split('.');
        return major === currentMajor;
    }
}
