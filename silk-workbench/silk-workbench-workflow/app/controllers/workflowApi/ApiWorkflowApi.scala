package controllers.workflowApi

import akka.util.ByteString
import controllers.core.RequestUserContextAction
import controllers.util.ProjectUtils.getProjectAndTask
import controllers.workflowApi.variableWorkflow.VariableWorkflowRequestUtils
import javax.inject.Inject
import org.silkframework.workbench.workflow.WorkflowWithPayloadExecutor
import org.silkframework.workspace.activity.workflow.Workflow
import play.api.http.HttpEntity
import play.api.mvc.{Action, AnyContent, InjectedController, ResponseHeader, Result}

/**
  * Workflow API.
  */
class ApiWorkflowApi @Inject()() extends InjectedController {
  /**
    * Run a variable workflow, where some of the tasks are configured at request time and dataset payload may be
    * delivered inside the request.
    */
  def variableWorkflowResult(projectName: String,
                             workflowTaskName: String): Action[AnyContent] = RequestUserContextAction { implicit request => implicit userContext =>
    implicit val (project, workflowTask) = getProjectAndTask[Workflow](projectName, workflowTaskName)

    val (workflowConfig, mimeType) = VariableWorkflowRequestUtils.queryStringToWorkflowConfig(project, workflowTask)
    val activity = workflowTask.activity[WorkflowWithPayloadExecutor]
    val id = activity.startBlocking(workflowConfig)
    val outputResource = activity.instance(id).value().resourceManager.get(VariableWorkflowRequestUtils.OUTPUT_FILE_RESOURCE_NAME, mustExist = true)

    Result(
      header = ResponseHeader(OK, Map.empty),
      body = HttpEntity.Strict(ByteString(outputResource.loadAsBytes), Some(mimeType))
    )
  }
}
