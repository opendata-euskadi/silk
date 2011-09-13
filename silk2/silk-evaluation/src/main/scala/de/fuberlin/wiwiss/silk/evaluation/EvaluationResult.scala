package de.fuberlin.wiwiss.silk.evaluation

import scala.math.sqrt

/**
 * Holds the evaluation result of a link specification.
 * Provides various information retrieval metrics.
 */
class EvaluationResult(val truePositives: Int, val trueNegatives: Int,
                       val falsePositives: Int, val falseNegatives: Int) {

  def score: Double = mcc

  /**
   * The '''specificity''' or '''true negative rate (TNR)''' is the proportion of the links which have not been generated of the negative links in the alignment.
   */
  def specificity = trueNegatives.toDouble / (trueNegatives + falsePositives)

  /**
   * The '''recall''', '''sensitivity''' or '''true positive rate (TPR)''' is the proportion of the links which have been generated of the positive links in the alignment.
   */
  def recall = truePositives.toDouble / (truePositives + falseNegatives)

  /**
   * The '''precision''' or '''positive predictive value (PPV)''' is the proportion of positive links in the alignment which have been generated.
   */
  def precision = if (truePositives > 0) truePositives.toDouble / (truePositives + falsePositives) else 0.0

  /**
   * The harmonic mean of precision and recall.
   */
  def fMeasure = if (precision + recall > 0.0) 2.0 * precision * recall / (precision + recall) else 0.0

  /**
   * Matthews correlation coefficient.
   */
  def mcc = {
    val cross = truePositives.toDouble * trueNegatives.toDouble - falsePositives.toDouble * falseNegatives.toDouble

    val sum = (truePositives + falsePositives).toDouble *
              (truePositives + falseNegatives).toDouble *
              (trueNegatives + falsePositives).toDouble *
              (trueNegatives + falseNegatives).toDouble

    if (sum != 0.0) cross / sqrt(sum) else 0.0
  }

  override def toString = "recall=%.3f precision=%.3f f1=%.3f mcc=%.3f score=%.3f".format(recall, precision, fMeasure, mcc, score)
}