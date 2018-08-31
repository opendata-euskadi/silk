package models.workflow

import org.silkframework.config.DefaultConfig

object WorkflowConfig {

  def executorName: String = DefaultConfig.instance().getString("execution.manager.plugin")

}
