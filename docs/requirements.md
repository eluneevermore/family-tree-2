# Family Tree v2 Requirements

## Data
- Store family tree data in a compact raw-text DSL.
- Load imported text files and export the current tree as `family-tree.family.txt`.
- Keep browser local autosave for convenience.
- Support legacy v1 text import.

## Text DSL
- Person line: `<id>:<name>,key=value,key=value`
- Relationship line: `<parent>[+<spouse>][-><child>,<child>]`
- Marriage without children: `a+b`
- Single parent: `a->child1,child2`
- Supported aliases:
  - `g=m`, `g=f`, `g=o`, `g=u`
  - `b=1950`
  - `d=2020`
  - `n=note text`
- Spaces around `:`, `+`, `->`, and `,` are accepted.
- Serialized output uses compact formatting.
- Duplicate relationship lines for the same parent pair are merged in memory and surfaced as warnings.

## Graph Layout
- Parents are positioned above children.
- People in the same generation stay on the same row.
- Spouses stay in the same generation row.
- Children are ordered oldest-to-youngest from left to right by `b=`.
- Missing or equal birth values keep the child order from the relationship line.
- Layout spacing must avoid node overlap as the tree grows.

## Editing
- Text view and graph view stay in sync.
- Users can add or select spouses and children directly from graph nodes.
- Graph edits rewrite the compact text through structured edits.
- Users can quickly search for a person in the graph.
- When typing a person id in edit forms, the app should auto-suggest matching existing people by id and name.

## Graph Interaction
- Person nodes are selectable by click.
- Spouses appear as side chips on a person node.
- Clicking a spouse chip focuses that spouse's main node.
- Marriage is shown as a plain line.
- Parent-child relationships are shown with arrows.
- Each family can be toggled to show or hide that couple's descendants.
- Family collapse state is UI-only and is not saved into the DSL.

## Relationship Labels
- The app supports multiple UI languages.
- Initial languages are English and Vietnamese.
- Vietnamese relationship labels use northern Vietnamese kinship terms.
- After selecting one person on the graph, hovering another person shows the relationship between them.
- Relationship hover text should explain how the selected person calls the hovered person, and how the hovered person calls the selected person, in the active language.

## Testing
- Parser tests cover compact syntax, legacy import, invalid syntax, duplicate IDs, unknown references, duplicate families, and serialization.
- Domain tests cover generation rows, multiple spouses, single-parent families, family collapse, sibling age ordering, and missing birth fallback.
- Component tests cover diagnostics, add spouse, add child, import/export, autosave, person selection, hover relationship labels, and ID autosuggest.
- Playwright smoke tests cover loading sample data, editing text, searching, collapsing families, graph person selection, relationship hover, and exporting.
