package org.silkframework.entity

import scala.language.implicitConversions

/**
  * A schema for a nested data model.
  */
case class NestedEntitySchema(rootSchemaNode: NestedSchemaNode) extends SchemaTrait

/**
  * A node in the nested schema.
  * @param entitySchema The schema of the entity at this point in the nested schema.
  * @param nestedEntities The child entity schemata of the current entity schema.
  */
case class NestedSchemaNode(entitySchema: EntitySchema, nestedEntities: IndexedSeq[(EntitySchemaConnection, NestedSchemaNode)])

/**
  * A connection from the parent entity to its nested entity.
  * @param path the Silk path from the parent to the child entity in the source or target data model.
  */
case class EntitySchemaConnection(path: Path)

object NestedEntitySchema {
  implicit def toNestedSchema(entitySchema: EntitySchema): NestedEntitySchema = {
    NestedEntitySchema(NestedSchemaNode(entitySchema, IndexedSeq()))
  }

  implicit def toEntitySchema(nestedSchema: NestedEntitySchema): EntitySchema = {
    assert(nestedSchema.rootSchemaNode.nestedEntities.isEmpty, "Cannot convert nested schema to entity schema!")
    val entitySchema = nestedSchema.rootSchemaNode.entitySchema
    entitySchema
  }
}