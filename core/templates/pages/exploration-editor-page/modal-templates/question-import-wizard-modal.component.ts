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
 * @fileoverview Component for the question import wizard modal.
 */

import {Component, OnInit, Input} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {QuestionData} from 'domain/question/question-schema-validator.service';
import {QuestionCreatorService} from '../services/question-creator.service';
import {ImportedQuestionsSkillService} from '../services/imported-questions-skill.service';
import {QuizExplorationGeneratorService} from '../services/quiz-exploration-generator.service';

enum WizardStep {
  SELECT_QUESTIONS = 1,
  ASSIGN_SKILLS = 2,
  REVIEW = 3,
  SAVING = 4,
  COMPLETE = 5,
}

interface QuestionWithMetadata {
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
  // Metadata fields
  selected: boolean;
  skillId: string;
  skillDifficulty: number; // 0.0 = easy, 0.5 = medium, 1.0 = hard
}

@Component({
  selector: 'oppia-question-import-wizard-modal',
  templateUrl: './question-import-wizard-modal.component.html',
  styleUrls: ['./question-import-wizard-modal.component.css'],
})
export class QuestionImportWizardModalComponent implements OnInit {
  @Input() questions!: QuestionData[];

  currentStep: WizardStep = WizardStep.SELECT_QUESTIONS;
  questionsWithMetadata: QuestionWithMetadata[] = [];
  savedQuestionIds: string[] = [];
  isProcessing: boolean = false;
  errorMessage: string = '';
  currentQuestionIndex: number = 0;

  // Default skill ID (will be created if needed)
  DEFAULT_SKILL_ID: string = '';
  DEFAULT_SKILL_NAME: string = 'Imported Questions';

  // Expose enum to template
  WizardStep = WizardStep;

  constructor(
    private activeModal: NgbActiveModal,
    private questionCreatorService: QuestionCreatorService,
    private importedQuestionsSkillService: ImportedQuestionsSkillService,
    private quizGeneratorService: QuizExplorationGeneratorService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Check if questions array exists and is valid
      if (!this.questions || !Array.isArray(this.questions)) {
        this.errorMessage =
          'No questions provided. Please import questions first.';
        this.questionsWithMetadata = [];
        return;
      }

      // Get or create the default skill for imported questions
      this.DEFAULT_SKILL_ID =
        await this.importedQuestionsSkillService.getOrCreateDefaultSkillAsync();

      // Convert questions to include metadata
      this.questionsWithMetadata = this.questions.map(q => ({
        ...q,
        selected: true, // Select all by default
        skillId: this.DEFAULT_SKILL_ID, // Use the created/fetched skill ID
        skillDifficulty: 0.5, // Medium difficulty by default
      }));
    } catch (error) {
      this.errorMessage = `Failed to initialize: ${error}`;
      console.error('Error in ngOnInit:', error);
    }
  }

  get selectedQuestions(): QuestionWithMetadata[] {
    return this.questionsWithMetadata.filter(q => q.selected);
  }

  get selectedCount(): number {
    return this.selectedQuestions.length;
  }

  get progressPercentage(): number {
    if (this.selectedQuestions.length === 0) {
      return 0;
    }
    return (this.savedQuestionIds.length / this.selectedQuestions.length) * 100;
  }

  selectAll(): void {
    this.questionsWithMetadata.forEach(q => (q.selected = true));
  }

  deselectAll(): void {
    this.questionsWithMetadata.forEach(q => (q.selected = false));
  }

  getDifficultyLabel(skillDifficulty: number): string {
    if (skillDifficulty < 0.33) return 'Easy';
    if (skillDifficulty < 0.67) return 'Medium';
    return 'Hard';
  }

  nextStep(): void {
    this.errorMessage = '';

    switch (this.currentStep) {
      case WizardStep.SELECT_QUESTIONS:
        if (this.selectedQuestions.length === 0) {
          this.errorMessage = 'Please select at least one question.';
          return;
        }
        this.currentStep = WizardStep.ASSIGN_SKILLS;
        break;

      case WizardStep.ASSIGN_SKILLS:
        this.currentStep = WizardStep.REVIEW;
        break;

      case WizardStep.REVIEW:
        this.saveQuestions();
        break;

      case WizardStep.COMPLETE:
        this.close();
        break;
    }
  }

  previousStep(): void {
    this.errorMessage = '';

    switch (this.currentStep) {
      case WizardStep.ASSIGN_SKILLS:
        this.currentStep = WizardStep.SELECT_QUESTIONS;
        break;

      case WizardStep.REVIEW:
        this.currentStep = WizardStep.ASSIGN_SKILLS;
        break;
    }
  }

  async saveQuestions(): Promise<void> {
    this.currentStep = WizardStep.SAVING;
    this.isProcessing = true;
    this.savedQuestionIds = [];

    try {
      for (const question of this.selectedQuestions) {
        const questionId =
          await this.questionCreatorService.createQuestionFromImport(
            question,
            [question.skillId],
            [question.skillDifficulty]
          );
        this.savedQuestionIds.push(questionId);
        this.currentQuestionIndex++;
      }

      this.currentStep = WizardStep.COMPLETE;
    } catch (error) {
      this.errorMessage = `Error saving questions: ${error}`;
      this.currentStep = WizardStep.REVIEW;
    } finally {
      this.isProcessing = false;
    }
  }

  close(): void {
    this.activeModal.close();
  }

  /**
   * Generates quiz states JSON from imported questions.
   */
  async generateQuiz(): Promise<void> {
    if (this.savedQuestionIds.length === 0) {
      this.errorMessage =
        'No questions have been saved yet. Please save questions first.';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      const result = await this.quizGeneratorService.addQuestionsAsStates(
        this.savedQuestionIds
      );

      console.log(`✅ Quiz states generated successfully!`);
      console.log(`States created: ${result.statesAdded}`);
      console.log(`State names: ${result.stateNames.join(', ')}`);
      console.log(`\n📋 Copy this JSON to add states to your exploration:`);
      console.log(JSON.stringify(result.statesJSON, null, 2));

      alert(
        `✅ Quiz states generated!\n\n` +
          `${result.statesAdded} states created.\n\n` +
          `Check the browser console (F12) to see the generated JSON.\n` +
          `You can copy this JSON and manually add it to your exploration.`
      );

      // Close modal
      this.activeModal.close({
        success: true,
        statesAdded: result.statesAdded,
        stateNames: result.stateNames,
        statesJSON: result.statesJSON,
      });
    } catch (error) {
      this.errorMessage = `Failed to generate quiz: ${error}`;
      console.error('Error generating quiz:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  cancel(): void {
    this.activeModal.dismiss('cancel');
  }
}
