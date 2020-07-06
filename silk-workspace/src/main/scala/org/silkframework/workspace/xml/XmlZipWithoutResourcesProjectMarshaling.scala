package org.silkframework.workspace.xml

import org.silkframework.runtime.plugin.annotations.Plugin

@Plugin(
  id = "xmlZipWithoutResourcesMarshalling",
  label = "XML/ZIP file (without resources)",
  description = "ZIP archive, which includes XML meta data but no resource files."
)
case class XmlZipWithoutResourcesProjectMarshaling() extends XmlZipProjectMarshaling {

  def id: String = XmlZipWithoutResourcesProjectMarshaling.marshallerId

  val name = "XML/ZIP file (without resources)"

  def includeResources: Boolean = false
}

object XmlZipWithoutResourcesProjectMarshaling {

  val marshallerId = "xmlZipWithoutResources"

}
