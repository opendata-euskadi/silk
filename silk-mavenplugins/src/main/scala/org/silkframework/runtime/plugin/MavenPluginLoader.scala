package org.silkframework.runtime.plugin

import java.io.File
import java.net.{URL, URLClassLoader}
import org.silkframework.config.Config

import scala.collection.JavaConversions._

import org.apache.maven.repository.internal.MavenRepositorySystemUtils
import org.eclipse.aether.artifact.{Artifact, DefaultArtifact}
import org.eclipse.aether.collection.CollectRequest
import org.eclipse.aether.connector.basic.BasicRepositoryConnectorFactory
import org.eclipse.aether.graph.Dependency
import org.eclipse.aether.repository.{LocalRepository, RemoteRepository}
import org.eclipse.aether.resolution.DependencyRequest
import org.eclipse.aether.spi.connector.RepositoryConnectorFactory
import org.eclipse.aether.spi.connector.transport.TransporterFactory
import org.eclipse.aether.transport.file.FileTransporterFactory
import org.eclipse.aether.transport.http.HttpTransporterFactory
import org.eclipse.aether.util.graph.visitor.PreorderNodeListGenerator
import org.eclipse.aether.{RepositorySystem, RepositorySystemSession}

/**
  * Loads plugins from Maven.
  */
object MavenPluginLoader {

  private val repoSystem = newRepositorySystem

  private val session = newSession(repoSystem)

  registerPlugins(Seq(new DefaultArtifact("org.silkframework", "silk-plugins-spatialtemporal_2.11", "jar", "2.7.0")))

  def registerPlugins(): Unit = {
    // TODO load from configuration Config().atPath("plugins")
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

    session
  }
}
