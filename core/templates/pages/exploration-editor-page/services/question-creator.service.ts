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
 * @fileoverview Service for creating Oppia Question objects from imported question data.
 */

import {Injectable} from '@angular/core';
import {QuestionData} from 'domain/question/question-schema-validator.service';
import {Question} from 'domain/question/question.model';
import {State} from 'domain/state/state.model';
import {SubtitledHtml} from 'domain/exploration/subtitled-html.model';
import {Outcome} from 'domain/exploration/outcome.model';
import {AnswerGroup} from 'domain/exploration/answer-group.model';
import {Rule} from 'domain/exploration/rule.model';
import {Hint} from 'domain/exploration/hint-object.model';
import {Interaction} from 'domain/exploration/interaction.model';
import {EditableQuestionBackendApiService} from 'domain/question/editable-question-backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class QuestionCreatorService {
  constructor(
    private editableQuestionBackendApiService: EditableQuestionBackendApiService
  ) {}

  /**
   * Creates an Oppia Question from imported question data.
   * @param questionData - The imported question data
   * @param skillIds - Skill IDs to link the question to
   * @param skillDifficulties - Difficulty levels for each skill (0.0-1.0)
   * @returns Promise that resolves with the created question ID
   */
  async createQuestionFromImport(
    questionData: QuestionData,
    skillIds: string[],
    skillDifficulties: number[]
  ): Promise<string> {
    try {
      // 1. Create State from question data
      const state = this.createStateForQuestion(questionData);

      // 2. Create Question object
      const question = new Question(
        null, // ID will be set by backend
        state,
        'en', // Default to English
        1, // Initial version
        skillIds,
        [], // No inapplicable misconceptions
        this.getNextContentIdIndex(state)
      );

      // 3. Save to backend
      const response =
        await this.editableQuestionBackendApiService.createQuestionAsync(
          skillIds,
          skillDifficulties,
          question.toBackendDict(true),
          [] // No images for now
        );

      console.log(
        `✅ Created question: "${questionData.question_text}" (ID: ${response.questionId})`
      );
      return response.questionId;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Creates a State object from question data.
   */
  private createStateForQuestion(questionData: QuestionData): State {
    // Create default state
    const state = State.createDefaultState(
      null, // Name is not used for questions
      'content_0',
      'default_outcome_1'
    );

    // Set question text as content
    state.content = SubtitledHtml.createDefault(
      questionData.question_text,
      'content_0'
    );

    // Configure interaction based on question type
    if (questionData.type === 'mcq') {
      this.configureMCQInteraction(state, questionData);
    } else if (questionData.type === 'numeric') {
      this.configureNumericInteraction(state, questionData);
    }

    // Add hints if available
    if (questionData.hints && questionData.hints.length > 0) {
      state.interaction.hints = questionData.hints.map((hintText, index) => {
        return Hint.createNew(`hint_${index}`, hintText);
      });
    }

    return state;
  }

  /**
   * Configures MCQ interaction for a state.
   */
  private configureMCQInteraction(
    state: State,
    questionData: QuestionData
  ): void {
    // Set interaction ID
    state.interaction.id = 'MultipleChoiceInput';

    // Configure choices
    const choices = questionData.options.map((option, index) => {
      return SubtitledHtml.createDefault(option.text, `ca_choices_${index}`);
    });

    state.interaction.customizationArgs = {
      choices: {value: choices},
      showChoicesInShuffledOrder: {value: true},
    };

    // Find correct answer index
    const correctOptionIndex = questionData.options.findIndex(
      opt => opt.id === questionData.correct_answer
    );

    if (correctOptionIndex !== -1) {
      // Create answer group for correct answer
      const correctRule = Rule.createNew(
        'Equals',
        {x: correctOptionIndex},
        {x: 'NonnegativeInt'}
      );

      const correctOutcome = new Outcome(
        null, // No destination for questions
        null, // No destIfReallyStuck
        SubtitledHtml.createDefault(
          questionData.explanation || 'Correct!',
          'feedback_1'
        ),
        true, // Mark as correct
        [], // No param changes
        null, // No refresher exploration
        null // No missing prerequisite skill
      );

      const correctAnswerGroup = AnswerGroup.createNew(
        [correctRule],
        correctOutcome,
        [],
        null
      );

      state.interaction.answerGroups = [correctAnswerGroup];
    }

    // Set default outcome for incorrect answers
    state.interaction.defaultOutcome = new Outcome(
      null, // No destination
      null, // No destIfReallyStuck
      SubtitledHtml.createDefault('Try again!', 'default_outcome_1'),
      false, // Not correct
      [], // No param changes
      null, // No refresher exploration
      null // No missing prerequisite skill
    );
  }

  /**
   * Configures Numeric interaction for a state.
   */
  private configureNumericInteraction(
    state: State,
    questionData: QuestionData
  ): void {
    // Set interaction ID
    state.interaction.id = 'NumericInput';

    // No customization args needed for NumericInput
    state.interaction.customizationArgs = {};

    // Parse correct answer
    const correctAnswer =
      typeof questionData.answer === 'string'
        ? parseFloat(questionData.answer)
        : questionData.answer;
    const tolerance = questionData.tolerance || 0;

    // Create answer group with tolerance rule
    const numericRule = Rule.createNew(
      'IsWithinTolerance',
      {x: correctAnswer, tol: tolerance},
      {x: 'Real', tol: 'Real'}
    );

    const correctOutcome = new Outcome(
      null, // No destination
      null, // No destIfReallyStuck
      SubtitledHtml.createDefault(
        questionData.explanation || 'Correct!',
        'feedback_1'
      ),
      true, // Mark as correct
      [], // No param changes
      null, // No refresher exploration
      null // No missing prerequisite skill
    );

    const correctAnswerGroup = AnswerGroup.createNew(
      [numericRule],
      correctOutcome,
      [],
      null
    );

    state.interaction.answerGroups = [correctAnswerGroup];

    // Set default outcome
    state.interaction.defaultOutcome = new Outcome(
      null, // No destination
      null, // No destIfReallyStuck
      SubtitledHtml.createDefault('Try again!', 'default_outcome_1'),
      false, // Not correct
      [], // No param changes
      null, // No refresher exploration
      null // No missing prerequisite skill
    );
  }

  /**
   * Calculates the next content ID index for a state.
   */
  private getNextContentIdIndex(state: State): number {
    let maxIndex = 0;

    // Check content
    if (state.content.contentId) {
      const match = state.content.contentId.match(/\d+/);
      if (match) {
        maxIndex = Math.max(maxIndex, parseInt(match[0], 10));
      }
    }

    // Check interaction customization args
    if (state.interaction.customizationArgs) {
      Object.values(state.interaction.customizationArgs).forEach((arg: any) => {
        if (arg.value && Array.isArray(arg.value)) {
          arg.value.forEach((item: any) => {
            if (item.contentId) {
              const match = item.contentId.match(/\d+/);
              if (match) {
                maxIndex = Math.max(maxIndex, parseInt(match[0], 10));
              }
            }
          });
        }
      });
    }

    // Check answer groups
    state.interaction.answerGroups.forEach(group => {
      if (group.outcome.feedback.contentId) {
        const match = group.outcome.feedback.contentId.match(/\d+/);
        if (match) {
          maxIndex = Math.max(maxIndex, parseInt(match[0], 10));
        }
      }
    });

    // Check default outcome
    if (state.interaction.defaultOutcome?.feedback.contentId) {
      const match =
        state.interaction.defaultOutcome.feedback.contentId.match(/\d+/);
      if (match) {
        maxIndex = Math.max(maxIndex, parseInt(match[0], 10));
      }
    }

    // Check hints
    state.interaction.hints.forEach(hint => {
      if (hint.hintContent.contentId) {
        const match = hint.hintContent.contentId.match(/\d+/);
        if (match) {
          maxIndex = Math.max(maxIndex, parseInt(match[0], 10));
        }
      }
    });

    return maxIndex + 1;
  }
}
