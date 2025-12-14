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
 * @fileoverview Service for creating exploration states from imported questions.
 */

import {Injectable} from '@angular/core';
import {QuestionData} from 'domain/question/question-schema-validator.service';
import {ExplorationStatesService} from './exploration-states.service';
import {StateEditorService} from 'components/state-editor/state-editor-properties-services/state-editor.service';
import {SubtitledHtml} from 'domain/exploration/subtitled-html.model';
import {Outcome} from 'domain/exploration/outcome.model';
import {AnswerGroup} from 'domain/exploration/answer-group.model';
import {Rule} from 'domain/exploration/rule.model';
import {Hint} from 'domain/exploration/hint-object.model';

@Injectable({
  providedIn: 'root',
})
export class QuestionStateCreatorService {
  constructor(
    private explorationStatesService: ExplorationStatesService,
    private stateEditorService: StateEditorService
  ) {}

  /**
   * Creates an exploration state from a question.
   * @param question - The question data to convert
   * @param insertAfterState - State name to insert after, or 'end' for end of exploration
   * @returns Promise that resolves when state is created
   */
  async createStateFromQuestion(
    question: QuestionData,
    insertAfterState: string = 'end'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Check if ExplorationStatesService is initialized
        if (!this.explorationStatesService.isInitialized()) {
          const error = new Error(
            'ExplorationStatesService is not initialized. Please ensure the exploration is loaded before creating states.'
          );
          console.error(error.message);
          reject(error);
          return;
        }

        // Generate unique state name
        const stateName = this.generateUniqueStateName(question);

        // Create the state using ExplorationStatesService
        this.explorationStatesService.addState(
          stateName,
          (newStateName: string) => {
            try {
              // Set the state as active to configure it
              this.stateEditorService.setActiveStateName(newStateName);

              // Configure the state based on question type
              if (question.type === 'mcq') {
                this.configureMCQState(newStateName, question);
              } else if (question.type === 'numeric') {
                this.configureNumericState(newStateName, question);
              }

              console.log(
                `✅ Created state: "${newStateName}" from question: "${question.question_text}"`
              );
              resolve(newStateName);
            } catch (error) {
              console.error('Error configuring state:', error);
              reject(error);
            }
          }
        );
      } catch (error) {
        console.error('Error creating state:', error);
        reject(error);
      }
    });
  }

  /**
   * Generates a unique state name based on the question.
   */
  private generateUniqueStateName(question: QuestionData): string {
    // Create base name from question ID or text
    let baseName =
      question.id ||
      question.question_text
        .substring(0, 30)
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');

    if (!baseName) {
      baseName = 'Question';
    }

    // Ensure uniqueness by checking existing states
    let stateName = baseName;
    let counter = 1;

    // Check if ExplorationStatesService is initialized before using hasState
    if (this.explorationStatesService.isInitialized()) {
      while (this.explorationStatesService.hasState(stateName)) {
        stateName = `${baseName}_${counter}`;
        counter++;
      }
    } else {
      // If not initialized, just add timestamp for uniqueness
      const timestamp = Date.now();
      stateName = `${baseName}_${timestamp}`;
    }

    return stateName;
  }

  /**
   * Configures a state for an MCQ question.
   */
  private configureMCQState(stateName: string, question: QuestionData): void {
    // 1. Set state content to question text
    const currentContent =
      this.explorationStatesService.getStateContentMemento(stateName);
    currentContent.html = question.question_text;
    this.explorationStatesService.saveStateContent(stateName, currentContent);

    // 2. Set interaction to MultipleChoiceInput
    this.explorationStatesService.saveInteractionId(
      stateName,
      'MultipleChoiceInput'
    );

    // 3. Configure choices from question options
    const choices = question.options.map(option => {
      return SubtitledHtml.createDefault(option.text, 'ca_choices');
    });

    const customizationArgs = {
      choices: {value: choices},
      showChoicesInShuffledOrder: {value: true},
    };
    this.explorationStatesService.saveInteractionCustomizationArgs(
      stateName,
      customizationArgs
    );

    // 4. Create answer group for correct answer
    const correctOptionIndex = question.options.findIndex(
      opt => opt.id === question.correct_answer
    );

    if (correctOptionIndex !== -1) {
      const correctAnswerRule = Rule.createNew(
        'Equals',
        {x: correctOptionIndex},
        {}
      );

      const correctOutcome = new Outcome(
        stateName, // dest - stay on same state for now
        null, // destIfReallyStuck
        SubtitledHtml.createDefault(
          question.explanation || 'Correct!',
          'feedback'
        ),
        false, // refresherExplorationId
        null, // missingPrerequisiteSkillId
        null, // labelledAsCorrect
        null // paramChanges
      );

      const correctAnswerGroup = AnswerGroup.createNew(
        [correctAnswerRule],
        correctOutcome,
        [], // trainingData
        null // taggedSkillMisconceptionId
      );

      this.explorationStatesService.saveInteractionAnswerGroups(stateName, [
        correctAnswerGroup,
      ]);
    }

    // 5. Set default outcome for incorrect answers
    const defaultOutcome = new Outcome(
      stateName, // dest
      null, // destIfReallyStuck
      SubtitledHtml.createDefault('Try again!', 'default_outcome'),
      false, // refresherExplorationId
      null, // missingPrerequisiteSkillId
      null, // labelledAsCorrect
      null // paramChanges
    );
    this.explorationStatesService.saveInteractionDefaultOutcome(
      stateName,
      defaultOutcome
    );

    // 6. Add hints if available
    if (question.hints && question.hints.length > 0) {
      const hints = question.hints.map((hintText, index) => {
        const hintContentId = `hint_${index}`;
        return Hint.createNew(hintContentId, hintText);
      });
      this.explorationStatesService.saveHints(stateName, hints);
    }
  }

  /**
   * Configures a state for a numeric question.
   */
  private configureNumericState(
    stateName: string,
    question: QuestionData
  ): void {
    // 1. Set state content to question text
    const currentContent =
      this.explorationStatesService.getStateContentMemento(stateName);
    currentContent.html = question.question_text;
    this.explorationStatesService.saveStateContent(stateName, currentContent);

    // 2. Set interaction to NumericInput
    this.explorationStatesService.saveInteractionId(stateName, 'NumericInput');

    // 3. No customization args needed for NumericInput
    this.explorationStatesService.saveInteractionCustomizationArgs(
      stateName,
      {}
    );

    // 4. Create answer group with tolerance rule
    const tolerance = question.tolerance || 0;
    const correctAnswer =
      typeof question.answer === 'string'
        ? parseFloat(question.answer)
        : question.answer;

    const numericRule = Rule.createNew(
      'IsWithinTolerance',
      {x: correctAnswer, tol: tolerance},
      {}
    );

    const correctOutcome = new Outcome(
      stateName, // dest
      null, // destIfReallyStuck
      SubtitledHtml.createDefault(
        question.explanation || 'Correct!',
        'feedback'
      ),
      false, // refresherExplorationId
      null, // missingPrerequisiteSkillId
      null, // labelledAsCorrect
      null // paramChanges
    );

    const correctAnswerGroup = AnswerGroup.createNew(
      [numericRule],
      correctOutcome,
      [],
      null
    );

    this.explorationStatesService.saveInteractionAnswerGroups(stateName, [
      correctAnswerGroup,
    ]);

    // 5. Set default outcome for incorrect answers
    const defaultOutcome = new Outcome(
      stateName, // dest
      null, // destIfReallyStuck
      SubtitledHtml.createDefault('Try again!', 'default_outcome'),
      false, // refresherExplorationId
      null, // missingPrerequisiteSkillId
      null, // labelledAsCorrect
      null // paramChanges
    );
    this.explorationStatesService.saveInteractionDefaultOutcome(
      stateName,
      defaultOutcome
    );

    // 6. Add hints if available
    if (question.hints && question.hints.length > 0) {
      const hints = question.hints.map((hintText, index) => {
        const hintContentId = `hint_${index}`;
        return Hint.createNew(hintContentId, hintText);
      });
      this.explorationStatesService.saveHints(stateName, hints);
    }
  }
}
