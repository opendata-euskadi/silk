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

package org.silkframework.rule.plugins.aggregator

import org.scalatest.{FlatSpec, Matchers}
import org.silkframework.rule.plugins.aggegrator.MinimumAggregator
import org.silkframework.rule.similarity.{SimilarityScore, WeightedSimilarityScore}
import org.silkframework.test.PluginTest
import org.silkframework.testutil.approximatelyEqualTo


class MinimumAggregatorTest extends PluginTest {

  val aggregator = new MinimumAggregator()

  it should "return the minimum" in {
    aggregator.evaluate((1, 1.0) :: (1, 1.0) :: (1, 1.0) :: Nil).get should be(approximatelyEqualTo(1.0))
    aggregator.evaluate((1, 1.0) :: (1, 0.0) :: Nil).get should be(approximatelyEqualTo(0.0))
    aggregator.evaluate((1, 0.4) :: (1, 0.5) :: (1, 0.6) :: Nil).get should be(approximatelyEqualTo(0.4))
    aggregator.evaluate((1, 0.0) :: (1, 0.0) :: Nil).get should be(approximatelyEqualTo(0.0))
  }

  it should "interpret missing scores as -1.0" in {
    aggregator.evaluate(Seq(WeightedSimilarityScore(0.5, 1), WeightedSimilarityScore(None, 1))) shouldBe SimilarityScore(-1.0)
    aggregator.evaluate(Seq(WeightedSimilarityScore(-0.5, 1), WeightedSimilarityScore(None, 1))) shouldBe SimilarityScore(-1.0)
  }

  override def pluginObject = MinimumAggregator()
}
