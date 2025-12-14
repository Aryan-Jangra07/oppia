// Copyright 2024 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Service for generating quiz state JSON from imported questions.
 */

import {Injectable} from '@angular/core';
import {EditableQuestionBackendApiService} from 'domain/question/editable-question-backend-api.service';

export interface StateJSON {
  classifier_model_id: null;
  linked_skill_id: null;
  content: {
    content_id: string;
    html: string;
  };
  interaction: {
    id: string;
    customization_args: Record<string, unknown>;
    answer_groups: unknown[];
    default_outcome: unknown;
    confirmed_unclassified_answers: unknown[];
    hints: unknown[];
    solution: unknown;
  };
  param_changes: unknown[];
  solicit_answer_details: boolean;
  card_is_checkpoint: boolean;
  inapplicable_skill_misconception_ids: null;
}

export interface QuizGenerationResult {
  statesAdded: number;
  stateNames: string[];
  statesJSON: Record<string, StateJSON>;
  success: boolean;
}

interface QuestionObject {
  questionStateData: {
    content: {
      content_id: string;
      html: string;
    };
    interaction: {
      id: string;
      customizationArgs: Record<string, unknown>;
      answerGroups: Array<{
        outcome: {
          dest: string;
        };
      }>;
      defaultOutcome: {
        dest: string;
      } | null;
      confirmedUnclassifiedAnswers?: unknown[];
      hints?: unknown[];
      solution?: unknown;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class QuizExplorationGeneratorService {
  constructor(
    private questionBackendApiService: EditableQuestionBackendApiService
  ) {}

  /**
   * Generates quiz states JSON from imported questions.
   * Returns JSON that can be manually added to exploration.
   * @param questionIds Array of question IDs to convert to states.
   * @returns Promise that resolves with generation result including JSON.
   */
  async addQuestionsAsStates(
    questionIds: string[]
  ): Promise<QuizGenerationResult> {
    try {
      // Fetch all questions.
      const questions = await this.fetchQuestions(questionIds);

      // Generate state names.
      const stateNames = this.generateStateNames(questions.length);

      // Generate states JSON.
      const statesJSON = this.generateStatesJSON(questions, stateNames);

      return {
        statesAdded: questions.length + 1,
        stateNames: [...stateNames, 'Quiz_Complete'],
        statesJSON: statesJSON,
        success: true,
      };
    } catch (error) {
      throw new Error(`Failed to generate quiz states: ${error}`);
    }
  }

  /**
   * Fetches questions by their IDs.
   */
  private async fetchQuestions(
    questionIds: string[]
  ): Promise<QuestionObject[]> {
    const questions: QuestionObject[] = [];
    for (const questionId of questionIds) {
      try {
        const questionData =
          await this.questionBackendApiService.fetchQuestionAsync(questionId);
        questions.push(questionData.questionObject as QuestionObject);
      } catch (error) {
        // Skip questions that fail to fetch.
        continue;
      }
    }
    return questions;
  }

  /**
   * Generates unique state names.
   */
  private generateStateNames(count: number): string[] {
    const names: string[] = [];
    for (let i = 1; i <= count; i++) {
      names.push(`Question_${i}`);
    }
    return names;
  }

  /**
   * Generates the complete states JSON structure.
   */
  private generateStatesJSON(
    questions: QuestionObject[],
    stateNames: string[]
  ): Record<string, StateJSON> {
    const states: Record<string, StateJSON> = {};

    // Generate question states.
    questions.forEach((question, index) => {
      const stateName = stateNames[index];
      const nextStateName =
        index < questions.length - 1 ? stateNames[index + 1] : 'Quiz_Complete';

      states[stateName] = this.convertQuestionToStateDict(
        question,
        nextStateName
      );
    });

    // Add final completion state.
    const quizCompleteKey = 'Quiz_Complete';
    states[quizCompleteKey] = this.createCompletionStateDict();

    return states;
  }

  /**
   * Converts a Question object to a state dictionary.
   */
  private convertQuestionToStateDict(
    question: QuestionObject,
    nextStateName: string
  ): StateJSON {
    const questionState = question.questionStateData;

    return {
      classifier_model_id: null,
      linked_skill_id: null,
      content: questionState.content,
      interaction: {
        id: questionState.interaction.id,
        customization_args: questionState.interaction.customizationArgs,
        answer_groups: questionState.interaction.answerGroups.map(ag => ({
          ...ag,
          outcome: {
            ...ag.outcome,
            dest: nextStateName,
          },
        })),
        default_outcome: questionState.interaction.defaultOutcome
          ? {
              ...questionState.interaction.defaultOutcome,
              dest: nextStateName,
            }
          : null,
        confirmed_unclassified_answers:
          questionState.interaction.confirmedUnclassifiedAnswers || [],
        hints: questionState.interaction.hints || [],
        solution: questionState.interaction.solution || null,
      },
      param_changes: [],
      solicit_answer_details: false,
      card_is_checkpoint: false,
      inapplicable_skill_misconception_ids: null,
    };
  }

  /**
   * Creates the final "Quiz Complete" state dictionary.
   */
  private createCompletionStateDict(): StateJSON {
    return {
      classifier_model_id: null,
      linked_skill_id: null,
      content: {
        content_id: 'content',
        html: '<p><strong>🎉 Quiz Completed!</strong></p><p>You have finished all questions. Great job!</p>',
      },
      interaction: {
        id: 'EndExploration',
        customization_args: {
          recommendedExplorationIds: {
            value: [],
          },
        },
        answer_groups: [],
        default_outcome: null,
        confirmed_unclassified_answers: [],
        hints: [],
        solution: null,
      },
      param_changes: [],
      solicit_answer_details: false,
      card_is_checkpoint: false,
      inapplicable_skill_misconception_ids: null,
    };
  }
}
