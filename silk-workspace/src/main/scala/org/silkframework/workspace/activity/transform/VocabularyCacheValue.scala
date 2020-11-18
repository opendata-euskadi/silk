package org.silkframework.workspace.activity.transform

import org.silkframework.entity.paths.UntypedPath
import org.silkframework.rule.TransformSpec
import org.silkframework.rule.TransformSpec.{TargetVocabularyCategory, TargetVocabularyListParameter}
import org.silkframework.rule.vocab.{TargetVocabularyParameterEnum, Vocabularies, Vocabulary}
import org.silkframework.runtime.activity.UserContext
import org.silkframework.runtime.serialization.{ReadContext, WriteContext, XmlFormat}
import org.silkframework.workspace.{ProjectTask, WorkspaceFactory}
import org.silkframework.workspace.activity.vocabulary.GlobalVocabularyCache

import scala.xml.Node

/**
  * The value of the vocabulary cache.
  * Holds the target vocabularies of the transformation and suggests types and properties from it.
  */
class VocabularyCacheValue(vocabularies: Seq[Vocabulary]) extends Vocabularies(vocabularies) with MappingCandidates {
  /**
    * Suggests mapping types.
    */
  override def suggestTypes: Seq[MappingCandidate] = {
    for (vocab <- vocabularies; clazz <- vocab.classes) yield
      MappingCandidate(clazz.info.uri, 0.0)
  }.distinct

  /**
    * Suggests mapping properties.
    */
  override def suggestProperties(sourcePath: UntypedPath): Seq[MappingCandidate] = {
    for (vocab <- vocabularies; prop <- vocab.properties) yield
      MappingCandidate(prop.info.uri, 0.0)
  }.distinct
}

object VocabularyCacheValue {

  /**
    * XML serialization format for a the cache value.
    */
  implicit object ValueFormat extends XmlFormat[VocabularyCacheValue] {

    def read(node: Node)(implicit readContext: ReadContext): VocabularyCacheValue = {
      new VocabularyCacheValue(Vocabularies.VocabulariesFormat.read(node).vocabularies)
    }

    def write(desc: VocabularyCacheValue)(implicit writeContext: WriteContext[Node]): Node = {
      Vocabularies.VocabulariesFormat.write(desc)
    }
  }

  /** Returns the target vocabularies of a transform task. */
  def targetVocabularies(transformTask: ProjectTask[TransformSpec])
                        (implicit userContext: UserContext): VocabularyCacheValue = {
    transformTask.targetVocabularies match {
      case TargetVocabularyCategory(category) =>
        val vocabularies: Seq[Vocabulary] = category match {
          case TargetVocabularyParameterEnum.`allInstalled` =>
            WorkspaceFactory().workspace.activity[GlobalVocabularyCache].value.get.
                map(_.vocabularies).
                getOrElse(Seq.empty)
          case TargetVocabularyParameterEnum.`noVocabularies` => Seq.empty
        }
        new VocabularyCacheValue(vocabularies)
      case TargetVocabularyListParameter(_) =>
        transformTask.activity[VocabularyCache].value()
    }
  }

}
