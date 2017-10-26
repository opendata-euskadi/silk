package org.silkframework.plugins.dataset.rdf

import org.scalatest.mock.MockitoSugar
import org.scalatest.{FlatSpec, MustMatchers}
import org.silkframework.dataset.rdf.Resource
import org.silkframework.entity.{Path, TypedPath, UriValueType}

/**
  *
  */
class InMemoryDatasetTest extends FlatSpec with MustMatchers with MockitoSugar {
  behavior of "In-memory Dataset"

  it should "write correct RDF when given entities with backward paths" in {
    val dataset = InMemoryDataset()
    val propertyUri = "<http://domain.com/backwardPath>"
    val subject = "http://subject.com/uri"
    val entities = Seq("http://domain.com/entity/1", "http://domain.com/entity/2")
    val paths = IndexedSeq(
      TypedPath(Path.parse(s"\\$propertyUri"), UriValueType)
    )
    val entitySink = dataset.entitySink
    entitySink.openTableWithPaths("", paths)
    entitySink.writeEntity(
      subject,
      Seq(entities)
    )
    entitySink.close()
    val result = dataset.sparqlEndpoint.select(s"SELECT ?s ?o WHERE { ?s $propertyUri ?o } ORDER BY ?s")
    result.bindings.flatMap(_.get("s")) mustBe entities.map(Resource)
    result.bindings.flatMap(_.get("o")) mustBe Seq(Resource(subject), Resource(subject))
  }
}
