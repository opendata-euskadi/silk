package org.silkframework.rule.plugins.aggegrator

import org.silkframework.entity.Index
import org.silkframework.rule.similarity.{Aggregator, SimilarityScore, SingleValueAggregator, WeightedSimilarityScore}
import org.silkframework.runtime.plugin.annotations.{Param, Plugin}

@Plugin(
  id = "scale",
  categories = Array("All"),
  label = "Scale",
  description = "Scales the result of the first input. All other inputs are ignored."
)
case class ScalingAggregator(
  @Param("All input similarity values are multiplied with this factor.")
  factor: Double = 1.0) extends SingleValueAggregator {

  require(factor >= 0.0 && factor <= 1.0, "Scaling factor must be a value between 0.0 and 1.0.")

  override def evaluateValue(value: WeightedSimilarityScore): SimilarityScore = {
    SimilarityScore(value.score.map(score => factor * score))
  }

  override def combineIndexes(index1: Index, index2: Index): Index = index1

  override def preProcessIndexes(indexes: Seq[Index]): Seq[Index] = indexes
}
