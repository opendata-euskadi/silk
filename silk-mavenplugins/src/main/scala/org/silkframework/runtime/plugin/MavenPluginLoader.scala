package org.silkframework.runtime.plugin

import java.io.File
import java.net.{URL, URLClassLoader}
import java.util.logging.Logger

import org.apache.maven.repository.internal.MavenRepositorySystemUtils
import org.eclipse.aether._
import org.eclipse.aether.artifact.{Artifact, DefaultArtifact}
import org.eclipse.aether.collection.CollectRequest
import org.eclipse.aether.connector.basic.BasicRepositoryConnectorFactory
import org.eclipse.aether.graph.Dependency
import org.eclipse.aether.repository.LocalRepository
import org.eclipse.aether.resolution.DependencyRequest
import org.eclipse.aether.spi.connector.RepositoryConnectorFactory
import org.eclipse.aether.spi.connector.transport.TransporterFactory
import org.eclipse.aether.transport.file.FileTransporterFactory
import org.eclipse.aether.transport.http.HttpTransporterFactory
import org.eclipse.aether.util.graph.visitor.PreorderNodeListGenerator
import org.silkframework.config.Config
import org.silkframework.util.Timer

import scala.collection.JavaConversions._

/**
  * Loads plugins from Maven.
  */
object MavenPluginLoader {

  private val log = Logger.getLogger(getClass.getName)

  private val repoSystem = newRepositorySystem

  private val session = newSession(repoSystem)

  /**
    * Registers all plugins that are configured at 'org.silkframework.runtime.plugin.remote'.
    */
  def registerPlugins(): Unit = Timer("Registering remote plugins") {
    val artifactConfigs = Config().getConfigList("org.silkframework.runtime.plugin.remote")
    val artifacts =
      for(config <- artifactConfigs) yield {
        new DefaultArtifact(
          config.getString("group") ,
          config.getString("artifact"),
          "jar",
          config.getString("version")
        )
      }
    registerPlugins(artifacts)
  }

  /**
    * Registers all plugins contained in a set of (Maven) artifacts.
    */
  private def registerPlugins(artifacts: Seq[Artifact]): Unit = {
    val urls = artifacts.flatMap(load).distinct

    val classLoader = new URLClassLoader(urls.toArray, getClass.getClassLoader)
    PluginRegistry.registerFromClasspath(classLoader)
  }

  /**
    * Resolves an artifact.
    *
    * @return The URL of the artifact and all of its dependencies.
    */
  private def load(artifact: Artifact): Seq[URL] = {
    val dependency = new Dependency(artifact, "compile")

    // val central = new RemoteRepository.Builder("central", "default", "http://repo1.maven.org/maven2/").build()

    val collectRequest = new CollectRequest()
    collectRequest.setRoot(dependency)
    // collectRequest.addRepository(central)
    val node = repoSystem.collectDependencies(session, collectRequest).getRoot

    val dependencyRequest = new DependencyRequest()
    dependencyRequest.setRoot(node)

    repoSystem.resolveDependencies(session, dependencyRequest)

    val nlg = new PreorderNodeListGenerator()
    node.accept(nlg)
    // System.out.println(nlg.getClassPath)

    nlg.getFiles.map(_.toURI.toURL)
  }


  def newRepositorySystem: RepositorySystem = {
    val locator = MavenRepositorySystemUtils.newServiceLocator()
    locator.addService(classOf[RepositoryConnectorFactory], classOf[BasicRepositoryConnectorFactory])
    locator.addService(classOf[TransporterFactory], classOf[FileTransporterFactory])
    locator.addService(classOf[TransporterFactory], classOf[HttpTransporterFactory])
    val system = locator.getService(classOf[RepositorySystem])

    system
  }

  def newSession(system: RepositorySystem): RepositorySystemSession = {
    val session = MavenRepositorySystemUtils.newSession()

    val localRepo = new LocalRepository(new File(System.getProperty("user.home"), ".m2/repository"))
    session.setLocalRepositoryManager( system.newLocalRepositoryManager(session, localRepo))
    session.setRepositoryListener(DownloadListener)
    session
  }

  /**
    * Logs artifact downloads.
    */
  object DownloadListener extends AbstractRepositoryListener {

    override def artifactDownloading(event: RepositoryEvent): Unit = {
      val artifact = event.getArtifact.getGroupId + ":" + event.getArtifact.getArtifactId
      val repository = event.getRepository.getId
      // val rootTrace = Iterator.iterate(event.getTrace)(_.getParent).dropWhile(_.getParent != null).next()
      // val rootArtifact = rootTrace.getData.asInstanceOf[DependencyRequest].getRoot.getArtifact
      // val rootArtifactName = rootArtifact.getGroupId + ":" + rootArtifact.getArtifactId

      log.info(s"Downloading Plugin dependency $artifact from $repository.")
    }
  }
}