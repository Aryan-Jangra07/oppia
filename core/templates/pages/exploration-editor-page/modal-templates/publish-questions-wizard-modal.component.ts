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
 * @fileoverview Component for the publish questions wizard modal.
 */

import {Component, OnInit, Input} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {QuestionData} from 'domain/question/question-schema-validator.service';
import {QuestionStateCreatorService} from '../services/question-state-creator.service';
import {ExplorationStatesService} from '../services/exploration-states.service';

enum WizardStep {
  SELECT_QUESTIONS = 1,
  PREVIEW_QUESTION = 2,
  CHOOSE_PLACEMENT = 3,
  CREATING_STATES = 4,
  COMPLETE = 5,
}

interface QuestionWithSelection extends QuestionData {
  selected: boolean;
  processed: boolean;
}

@Component({
  selector: 'oppia-publish-questions-wizard-modal',
  templateUrl: './publish-questions-wizard-modal.component.html',
  styleUrls: ['./publish-questions-wizard-modal.component.css'],
})
export class PublishQuestionsWizardModalComponent implements OnInit {
  @Input() questions!: QuestionData[];

  currentStep: WizardStep = WizardStep.SELECT_QUESTIONS;
  questionsWithSelection: QuestionWithSelection[] = [];
  selectedQuestions: QuestionWithSelection[] = [];
  currentQuestionIndex: number = 0;
  insertionPoint: string = 'end';
  availableStates: string[] = [];
  createdStatesCount: number = 0;
  isProcessing: boolean = false;
  errorMessage: string = '';

  // Expose enum to template
  WizardStep = WizardStep;

  constructor(
    private activeModal: NgbActiveModal,
    private questionStateCreatorService: QuestionStateCreatorService,
    private explorationStatesService: ExplorationStatesService
  ) {}

  ngOnInit(): void {
    // Convert questions to include selection state
    this.questionsWithSelection = this.questions.map(q => ({
      ...q,
      selected: true, // Select all by default
      processed: false,
    }));

    // Get available states for placement (only if service is initialized)
    if (this.explorationStatesService.isInitialized()) {
      this.availableStates = this.explorationStatesService.getStateNames();
    } else {
      this.availableStates = [];
      console.warn(
        'ExplorationStatesService not initialized yet. States will be added at the end.'
      );
    }
  }

  get currentQuestion(): QuestionWithSelection | null {
    if (
      this.currentQuestionIndex >= 0 &&
      this.currentQuestionIndex < this.selectedQuestions.length
    ) {
      return this.selectedQuestions[this.currentQuestionIndex];
    }
    return null;
  }

  get selectedCount(): number {
    return this.questionsWithSelection.filter(q => q.selected).length;
  }

  get progressPercentage(): number {
    if (this.selectedQuestions.length === 0) {
      return 0;
    }
    return (this.createdStatesCount / this.selectedQuestions.length) * 100;
  }

  selectAll(): void {
    this.questionsWithSelection.forEach(q => (q.selected = true));
  }

  deselectAll(): void {
    this.questionsWithSelection.forEach(q => (q.selected = false));
  }

  nextStep(): void {
    this.errorMessage = '';

    switch (this.currentStep) {
      case WizardStep.SELECT_QUESTIONS:
        this.selectedQuestions = this.questionsWithSelection.filter(
          q => q.selected
        );
        if (this.selectedQuestions.length === 0) {
          this.errorMessage = 'Please select at least one question.';
          return;
        }
        this.currentQuestionIndex = 0;
        this.currentStep = WizardStep.PREVIEW_QUESTION;
        break;

      case WizardStep.PREVIEW_QUESTION:
        this.currentStep = WizardStep.CHOOSE_PLACEMENT;
        break;

      case WizardStep.CHOOSE_PLACEMENT:
        this.createStatesFromQuestions();
        break;

      case WizardStep.CREATING_STATES:
        this.currentStep = WizardStep.COMPLETE;
        break;

      case WizardStep.COMPLETE:
        this.close();
        break;
    }
  }

  previousStep(): void {
    this.errorMessage = '';

    switch (this.currentStep) {
      case WizardStep.PREVIEW_QUESTION:
        this.currentStep = WizardStep.SELECT_QUESTIONS;
        break;

      case WizardStep.CHOOSE_PLACEMENT:
        this.currentStep = WizardStep.PREVIEW_QUESTION;
        break;
    }
  }

  async createStatesFromQuestions(): Promise<void> {
    this.currentStep = WizardStep.CREATING_STATES;
    this.isProcessing = true;
    this.createdStatesCount = 0;

    try {
      for (const question of this.selectedQuestions) {
        await this.questionStateCreatorService.createStateFromQuestion(
          question,
          this.insertionPoint
        );
        question.processed = true;
        this.createdStatesCount++;
      }

      this.currentStep = WizardStep.COMPLETE;
    } catch (error) {
      this.errorMessage = `Error creating states: ${error}`;
      this.currentStep = WizardStep.CHOOSE_PLACEMENT;
    } finally {
      this.isProcessing = false;
    }
  }

  getCorrectAnswerText(): string {
    if (!this.currentQuestion) {
      return '';
    }

    const q = this.currentQuestion;
    if (q.type === 'mcq') {
      const correctAnswers = Array.isArray(q.correct_answer)
        ? q.correct_answer
        : [q.correct_answer];
      const correctOptions = q.options?.filter(opt =>
        correctAnswers.includes(opt.id)
      );
      return correctOptions?.map(opt => opt.text).join(', ') || '';
    } else if (q.type === 'numeric') {
      return String(q.answer);
    }
    return '';
  }

  close(): void {
    this.activeModal.close({
      createdStatesCount: this.createdStatesCount,
    });
  }

  cancel(): void {
    this.activeModal.dismiss('cancel');
  }
}
