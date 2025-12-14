// Copyright 2024 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS-IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Service for managing the default skill for imported questions.
 */

import {Injectable} from '@angular/core';
import {SkillBackendApiService} from 'domain/skill/skill-backend-api.service';
import {SkillCreationBackendApiService} from 'domain/skill/skill-creation-backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class ImportedQuestionsSkillService {
  private readonly DEFAULT_SKILL_DESCRIPTION = 'Imported Questions';
  private cachedSkillId: string | null = null;

  constructor(
    private skillBackendApiService: SkillBackendApiService,
    private skillCreationBackendApiService: SkillCreationBackendApiService
  ) {}

  /**
   * Gets or creates the default skill for imported questions.
   * @returns Promise that resolves with the skill ID
   */
  async getOrCreateDefaultSkillAsync(): Promise<string> {
    // Return cached skill ID if available
    if (this.cachedSkillId) {
      return this.cachedSkillId;
    }

    try {
      // Always create a new skill with unique description
      // This avoids conflicts with existing skills
      return await this.createDefaultSkill();
    } catch (error) {
      console.error('Error creating default skill:', error);
      throw error;
    }
  }

  /**
   * Creates the default skill for imported questions.
   * @returns Promise that resolves with the created skill ID
   */
  private async createDefaultSkill(): Promise<string> {
    try {
      // Create unique skill description with timestamp to avoid duplicates
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueDescription = `${this.DEFAULT_SKILL_DESCRIPTION} (${timestamp})`;

      // Create explanation_dict in the correct format (SubtitledHtml dict)
      const explanationDict = {
        content_id: 'explanation',
        html: 'This skill contains questions that were imported from CSV/JSON files.',
      };

      // Create rubrics as a list with proper structure (must be an array)
      const rubrics = [
        {
          difficulty: 'Easy',
          explanations: ['Questions imported from external sources'],
        },
        {
          difficulty: 'Medium',
          explanations: ['Questions imported from external sources'],
        },
        {
          difficulty: 'Hard',
          explanations: ['Questions imported from external sources'],
        },
      ];

      const response =
        await this.skillCreationBackendApiService.createSkillAsync(
          uniqueDescription, // Use unique description
          rubrics as any,
          explanationDict as any,
          [],
          []
        );

      this.cachedSkillId = response.skillId;
      console.log(
        `✅ Created default skill: ${uniqueDescription} (ID: ${response.skillId})`
      );
      return response.skillId;
    } catch (error) {
      console.error('Error creating default skill:', error);
      throw new Error(`Failed to create default skill: ${error}`);
    }
  }

  /**
   * Clears the cached skill ID.
   */
  clearCache(): void {
    this.cachedSkillId = null;
  }
}
