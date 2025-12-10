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
 * @fileoverview Service for handling duplicate question IDs during import.
 */

import { Injectable } from '@angular/core';
import { QuestionData } from './question-schema-validator.service';

export interface DuplicateInfo {
    originalId: string;
    newId: string;
    action: 'rename' | 'skip' | 'replace';
}

export interface DuplicateResolutionResult {
    questions: QuestionData[];
    duplicates: DuplicateInfo[];
}

@Injectable({
    providedIn: 'root',
})
export class DuplicateResolutionService {
    /**
     * Detects duplicate question IDs in a list of questions.
     */
    detectDuplicates(questions: QuestionData[]): string[] {
        const idCounts = new Map<string, number>();
        const duplicates: string[] = [];

        questions.forEach(question => {
            const count = idCounts.get(question.id) || 0;
            idCounts.set(question.id, count + 1);
        });

        idCounts.forEach((count, id) => {
            if (count > 1) {
                duplicates.push(id);
            }
        });

        return duplicates;
    }

    /**
     * Automatically resolves duplicates by renaming.
     */
    autoResolveDuplicates(
        questions: QuestionData[],
        existingIds: Set<string> = new Set()
    ): DuplicateResolutionResult {
        const seenIds = new Set<string>(existingIds);
        const duplicates: DuplicateInfo[] = [];
        const resolvedQuestions: QuestionData[] = [];

        questions.forEach(question => {
            if (seenIds.has(question.id)) {
                // Generate a new unique ID
                const newId = this.generateUniqueId(question.id, seenIds);
                duplicates.push({
                    originalId: question.id,
                    newId: newId,
                    action: 'rename',
                });

                resolvedQuestions.push({
                    ...question,
                    id: newId,
                });
                seenIds.add(newId);
            } else {
                resolvedQuestions.push(question);
                seenIds.add(question.id);
            }
        });

        return {
            questions: resolvedQuestions,
            duplicates,
        };
    }

    /**
     * Generates a unique ID by appending a counter.
     */
    private generateUniqueId(baseId: string, existingIds: Set<string>): string {
        let counter = 1;
        let newId = `${baseId}_${counter}`;

        while (existingIds.has(newId)) {
            counter++;
            newId = `${baseId}_${counter}`;
        }

        return newId;
    }

    /**
     * Merges two question lists, resolving duplicates.
     */
    mergeQuestions(
        existingQuestions: QuestionData[],
        newQuestions: QuestionData[],
        strategy: 'rename' | 'skip' | 'replace' = 'rename'
    ): DuplicateResolutionResult {
        const existingIds = new Set(existingQuestions.map(q => q.id));
        const duplicates: DuplicateInfo[] = [];
        const mergedQuestions = [...existingQuestions];

        newQuestions.forEach(question => {
            if (existingIds.has(question.id)) {
                if (strategy === 'rename') {
                    const newId = this.generateUniqueId(question.id, existingIds);
                    duplicates.push({
                        originalId: question.id,
                        newId: newId,
                        action: 'rename',
                    });
                    mergedQuestions.push({ ...question, id: newId });
                    existingIds.add(newId);
                } else if (strategy === 'replace') {
                    const index = mergedQuestions.findIndex(q => q.id === question.id);
                    if (index !== -1) {
                        mergedQuestions[index] = question;
                        duplicates.push({
                            originalId: question.id,
                            newId: question.id,
                            action: 'replace',
                        });
                    }
                } else {
                    // skip
                    duplicates.push({
                        originalId: question.id,
                        newId: question.id,
                        action: 'skip',
                    });
                }
            } else {
                mergedQuestions.push(question);
                existingIds.add(question.id);
            }
        });

        return {
            questions: mergedQuestions,
            duplicates,
        };
    }
}
