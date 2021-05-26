# Strapi plugin tree

Adds nested set support in Strapi admin for Content Types

Goals:
- draggable tree UI for visual nesting
- support for both Parent/Child as NestedSet model
- translation independent tree structures

#### Parent/Child
An internal one-to-many relation between records of the same model determines
the tree structure.  Currently expects the parent relation to be named `parent`
and the opposite relation to be named `children`.
Edits are easy (single record update) but getting or filtering the tree in a 
desirable structure is harder as it requires a recursive approach.

#### NestedSet
4 internal columns determine the position of the record in the tree.
Currently expects these fields to be named: `rt`, `lft`, `rgt`, `lvl`
Querying and filtering the tree is easy and requires no recursion.
Edits are harder as a single update requires the whole tree to be updated.

