# Family Tree v2 Milestones

## M1 - Project Foundation
- [x] Scaffold Vite React TypeScript app.
- [x] Add local package setup and build/test scripts.
- [x] Add Vitest, Testing Library, and Playwright setup.
- [x] Add base styling and app shell.

## M2 - Compact DSL
- [x] Parse compact person lines.
- [x] Parse compact relationship lines.
- [x] Serialize to compact canonical text.
- [x] Surface parser diagnostics.
- [x] Import legacy v1 syntax.
- [x] Cover parser and editor behavior with unit tests.

## M3 - Graph Layout
- [x] Compute generation rows from parent-child relationships.
- [x] Keep spouses on the same generation row.
- [x] Sort children oldest-to-youngest by birth value.
- [x] Preserve relationship-line order when ages are missing or equal.
- [x] Use deterministic spacing to avoid node overlap.
- [x] Render graph nodes and relationship edges.

## M4 - Editing Workflow
- [x] Keep text and graph views in sync.
- [x] Add spouse from a graph person node.
- [x] Add child from a graph person node.
- [x] Add spouse chips that focus the spouse node.
- [x] Add import, export, and local autosave.
- [x] Add autosuggest for existing people when typing a person id in edit forms.
- [x] Add person-id autosuggest in the raw DSL editor.

## M5 - Search And Visibility
- [x] Search people by id or name.
- [x] Highlight matching graph nodes.
- [x] Reveal hidden ancestor families when searching for a hidden descendant.
- [x] Toggle families to show or hide descendants.
- [x] Render a focused graph context with spouses as shortcut chips.
- [x] Switch focused graph ancestry when a spouse shortcut is clicked.

## M6 - Multilingual UI
- [x] Add app language state and language switcher.
- [x] Add English UI strings.
- [x] Add Vietnamese UI strings.
- [x] Localize graph/edit UI text where user-facing.
- [x] Localize parser diagnostics where user-facing.

## M7 - Relationship Hover
- [x] Add person selection state on graph click.
- [x] Add hover detection for other person nodes.
- [x] Compute relationship paths between selected and hovered people.
- [x] Display how each person calls the other in English.
- [x] Display how each person calls the other in northern Vietnamese terms.
- [x] Add component and Playwright coverage for selected-person hover labels.

## M8 - Final Validation
- [x] Run unit/component tests.
- [x] Run production build.
- [x] Run Playwright smoke tests.
- [x] Expand e2e coverage for multilingual relationship hover and ID autosuggest.
