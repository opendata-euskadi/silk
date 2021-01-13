/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.silkframework.rule.plugins.aggegrator

import org.silkframework.entity.Index
import org.silkframework.rule.similarity.{Aggregator, SimilarityScore, WeightedSimilarityScore}
import org.silkframework.runtime.plugin.PluginCategories
import org.silkframework.runtime.plugin.annotations.Plugin

@Plugin(
  id = "average",
  categories = Array("All", PluginCategories.recommended),
  label = "Average",
  description = "Computes the weighted average."
)
case class AverageAggregator() extends Aggregator {
  private val positiveWeight: Int = 1
  private val negativeWeight: Int = 1

  override def evaluate(values: Seq[WeightedSimilarityScore]): SimilarityScore = {
    if (values.nonEmpty) {
      var sumWeights = 0
      var sumValues = 0.0

      for (WeightedSimilarityScore(score, weight) <- values) {
        score match {
          case Some(score) =>
            if (score >= 0.0) {
              sumWeights += weight * positiveWeight
              sumValues += weight * positiveWeight * score
            }
            else if (score < 0.0) {
              sumWeights += weight * negativeWeight
              sumValues += weight * negativeWeight * score
            }
          case None =>
            return SimilarityScore.none
        }
      }

      SimilarityScore(sumValues / sumWeights)
    }
    else {
      SimilarityScore.none
    }
  }

  /**
   * Combines two indexes into one.
   */
  override def combineIndexes(index1: Index, index2: Index): Index = index1 disjunction index2

}
