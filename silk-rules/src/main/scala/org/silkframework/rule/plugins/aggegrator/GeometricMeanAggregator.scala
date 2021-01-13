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
import org.silkframework.runtime.plugin.annotations.Plugin

import scala.math._

/**
 * Computes the weighted geometric mean.
 */
@Plugin(
  id = "geometricMean",
  categories = Array("All"),
  label = "Geometric mean",
  description = "Compute the (weighted) geometric mean."
)
case class GeometricMeanAggregator() extends Aggregator {

  override def evaluate(values: Seq[WeightedSimilarityScore]): SimilarityScore = {
    if (values.nonEmpty) {
      var sumWeights = 0
      var weightedProduct = 1.0

      for (WeightedSimilarityScore(score, weight) <- values) {
        score match {
          case Some(score) =>
            sumWeights += weight
            weightedProduct *= pow(score, weight)
          case None =>
            return SimilarityScore.none
        }
      }

      SimilarityScore(pow(weightedProduct, 1.0 / sumWeights))
    }
    else {
      SimilarityScore.none
    }
  }

  /**
   * Combines two indexes into one.
   */
  override def combineIndexes(index1: Index, index2: Index)= index1 conjunction index2
}