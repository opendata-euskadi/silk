/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


package de.fuberlin.wiwiss.silk.server.model

import de.fuberlin.wiwiss.silk.datasource.DataSource
import de.fuberlin.wiwiss.silk.util.plugin.Plugin
import de.fuberlin.wiwiss.silk.entity.{SparqlRestriction, Path, Entity, EntityDescription}

/**
  * ${DESCRIPTION}
  *
  * <p><b>Company:</b>
  * SAT, Research Studios Austria</p>
  *
  * <p><b>Copyright:</b>
  * (c) 2011</p>
  *
  * <p><b>last modified:</b><br/>
  * $Author: $<br/>
  * $Date: $<br/>
  * $Revision: $</p>
  *
  * @author fkleedorfer
  */

/**
 * DataSource which doesn't retrieve any entities at all
 */
@Plugin(id = "nop", label = "inactive datasource", description = "DataSource which doesn't retrieve any entities at " +
  "all")
class NopDataSource extends DataSource {
  override def retrieve(entityDesc: EntityDescription, entities: Seq[String]) = {
    Traversable.empty[Entity]
  }

  override def retrievePaths(restrictions: SparqlRestriction, depth: Int, limit: Option[Int]): Traversable[(Path, Double)] = {
    Traversable.empty[(Path, Double)]
  }

}

