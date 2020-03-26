package org.silkframework.runtime.plugin

import org.silkframework.config.Prefixes
import org.silkframework.runtime.activity.UserContext
import org.silkframework.runtime.resource.ResourceManager

/**
  * Plugin type where each implementation can be used to auto-complete a specific type of parameter, e.g. over workflow tasks
  * or project resources etc.
  *
  * Implementations of this plugin must not have any parameters.
  */
trait PluginParameterAutoCompletionProvider {
  /** Auto-completion based on a text based search query */
  protected def autoComplete(searchQuery: String,
                             projectId: String)
                            (implicit userContext: UserContext): Traversable[AutoCompletionResult]

  /** Returns the label if exists for the given auto-completion value. This is needed if a value should
    * be presented to the user and the actual internal value is e.g. not human-readable.
    * @param value The value of the parameter.
    * */
  def valueToLabel(value: String)
                  (implicit userContext: UserContext): Option[String]

  /** Match search terms against string. Returns only true if all search terms match. */
  protected def matchesSearchTerm(lowerCaseSearchTerms: Seq[String],
                                  searchIn: String): Boolean = {
    val lowerCaseText = searchIn.toLowerCase
    lowerCaseSearchTerms forall lowerCaseText.contains
  }

  /** Split text query into multi term search */
  protected def extractSearchTerms(term: String): Array[String] = {
    term.toLowerCase.split("\\s+").filter(_.nonEmpty)
  }

  /** Auto-completion based on a text query with limit and offset. */
  def autoComplete(searchQuery: String,
                   projectId: String,
                   limit: Int,
                   offset: Int)
                  (implicit userContext: UserContext): Traversable[AutoCompletionResult] = {
    autoComplete(searchQuery, projectId).slice(offset, offset + limit)
  }
}

/**
  * A single auto-completion result.
  * @param value The value to which the parameter value should be set.
  * @param label An optional label that a human user would see instead. If it is missing the value is shown.
  */
case class AutoCompletionResult(value: String, label: Option[String])

/** Default auto-completion provider. This one always returns empty results. */
case class NopPluginParameterAutoCompletionProvider() extends PluginParameterAutoCompletionProvider {
  override protected def autoComplete(searchQuery: String, projectId: String)
                                     (implicit userContext: UserContext): Traversable[AutoCompletionResult] = Seq.empty

  override def valueToLabel(value: String)
                           (implicit userContext: UserContext): Option[String] = None

}

object PluginParameterAutoCompletionProvider {
  private val providerTrait = classOf[PluginParameterAutoCompletionProvider]
  /** Get an auto-completion plugin by ID. */
  def get(providerClass: Class[_ <: PluginParameterAutoCompletionProvider])
         (implicit prefixes: Prefixes,
          resourceManager: ResourceManager): PluginParameterAutoCompletionProvider = {
    assert(classOf[PluginParameterAutoCompletionProvider].isAssignableFrom(providerClass),
      s"Class ${providerClass.getCanonicalName} does not implement ${providerTrait.getCanonicalName}!")
    try {
      providerClass.getConstructor().newInstance()
    } catch {
      case _: NoSuchMethodException =>
        throw new RuntimeException(s"Auto-completion provider class '${providerClass.getCanonicalName}' does not provide an empty constructor.")
    }
  }
}