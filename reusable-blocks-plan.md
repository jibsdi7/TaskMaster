# Reusable Blocks Feature — Implementation Plan

## Top-Level Overview

Enhance the reusable blocks system across three dimensions:

1. **Workflow Canvas → Block**: Let users lasso/shift-select nodes on the workflow canvas and save the selection as a reusable block in one click. The selected nodes get replaced with a single `BLOCK` node inline.
2. **Block Editor — Recording**: Add a "Record" button to the Block Editor that starts a Playwright recording session, stops it, and imports the recorded actions as nodes directly onto the block canvas.
3. **Block Editor — UI Improvements**: Wire up the same `AddNodeButton` (plus-on-edge) feature, expand node config coverage to all node types, and fix auto-layout.

The backend API (`POST /api/blocks`, `PUT /api/blocks/:id`, `GET /api/blocks/:id/definition`, `/api/recorder/*`) already exists and needs no changes.

---

## Sub-Tasks

---

### Sub-Task 1 — Selection-to-Block on Workflow Canvas

**Intent**  
Allow users to select multiple existing nodes on the workflow canvas (via ReactFlow's built-in multi-select / lasso) and save them as a reusable block directly from the toolbar. After saving, the selected nodes are removed from the canvas and replaced with a single `BLOCK` node wired into the same position in the flow.

**Expected Outcomes**
- A "Save Selection as Block" button appears in the WorkflowToolbar (active only when ≥2 nodes are selected).
- Clicking it opens a dialog to enter block name, description, and category.
- On confirm: the backend `POST /api/blocks` is called with the selected nodes/edges, then the selected nodes are deleted from the canvas, and a new `BLOCK` node is inserted at their centroid position and re-wired to any external edges.
- A **toast notification** appears with two action buttons: **"Open in Editor"** (navigates to `/blocks/:id/edit`) and **"Dismantle"** (removes the BLOCK node and restores the original nodes/edges exactly as they were).
- The new block immediately appears in the NodePalette under "Reusable Blocks" on next fetch.

**Todo List**
1. Add `selectedNodes` selector to `workflowStore` — derive from `nodes` where `selected: true` (ReactFlow sets `node.selected` automatically on multi-select).
2. Add `replaceSelectionWithBlock` action to `workflowStore` — takes `blockId`, `blockName`, selected node IDs; removes selected nodes + their internal edges; inserts a `BLOCK` node at the centroid; reconnects external edges to the new BLOCK node.
3. Add `onSaveSelectionAsBlock` prop to `WorkflowToolbar`; add the toolbar button (disabled when `selectedNodeCount < 2`).
4. Add `SaveAsBlockDialog` component — fields: name, description, category, is_public toggle. On confirm calls `POST /api/blocks` then calls `replaceSelectionWithBlock`.
5. After successful save, store the original nodes/edges snapshot + the new BLOCK node id in a `lastSavedBlock` ref so "Dismantle" can restore them.
6. Show a persistent MUI `Snackbar` (not auto-hiding) with two buttons: **"Open in Editor"** (navigate to `/blocks/:id/edit` in a new tab) and **"Dismantle"** (restores original nodes/edges from snapshot, dismisses snackbar).
7. Wire everything in `WorkflowEditor.tsx`: pass handler down to toolbar, render the dialog and snackbar.

**Relevant Context**
- `frontend/src/store/workflowStore.ts` — `nodes`, `edges`, `deleteNode`, `addNode` patterns
- `frontend/src/components/workflow/WorkflowToolbar.tsx` — existing toolbar props interface
- `frontend/src/pages/WorkflowEditor.tsx` — `handleSaveAsBlock` already exists but only saves the whole workflow
- `frontend/src/components/workflow/WorkflowCanvas.tsx` — ReactFlow `onSelectionChange` callback available
- Backend: `POST /api/blocks` with `{ name, description, category, is_public, nodes, edges, inputs, outputs, metadata }`

**Status** — `[ ] pending`

---

### Sub-Task 2 — Recording Support in Block Editor

**Intent**  
Add a "Record" button to the Block Editor toolbar that mirrors the workflow editor's recording flow. When the user clicks Record, they enter a URL; Playwright opens a browser; the user performs actions; they click Stop; the recorded actions are fetched and imported as nodes onto the block canvas.

**Expected Outcomes**
- Block Editor toolbar shows a "Record" / "Stop" button pair identical in behaviour to WorkflowEditor.
- On stop, recorded nodes are **appended below** any existing nodes on the block canvas (they never replace or modify existing nodes).
- Sequential edges are automatically created between the newly appended nodes.
- The existing node config panel lets the user edit selector/value/url of any recorded node.

**Todo List**
1. Add recording state to `BlockEditor` (`isRecording`, `recordStatus`).
2. Add `handleRecord` and `handleStopRecording` functions — copy pattern from `WorkflowEditor.tsx` lines 315–410, adapted to add to `BlockEditor`'s local `nodes`/`edges` state instead of the Zustand store.
3. Add Record / Stop button pair to the Block Editor toolbar bar (the `<Box>` at lines 435–503 in `BlockEditor.tsx`).
4. On stop: call `POST /api/recorder/stop`, then fetch the recorded workflow; map nodes to `type: 'blockNode'`; calculate a Y offset = (max Y of existing nodes) + 120 so new nodes appear below; connect them in sequence with edges; append both to existing canvas state without touching existing nodes/edges.

**Relevant Context**
- `frontend/src/pages/WorkflowEditor.tsx` — `handleRecord` (line 315), `handleStopRecording` (line 349), `handleLoadRecordedWorkflow` pattern
- `frontend/src/pages/BlockEditor.tsx` — toolbar at lines 435–503, canvas state `nodes`/`edges`
- Backend: `POST /api/recorder/start`, `POST /api/recorder/stop`, `GET /api/recorder/workflow`

**Status** — `[ ] pending`

---

### Sub-Task 3 — Block Editor UI Improvements

**Intent**  
Three focused improvements to the Block Editor canvas experience:
1. Add the `AddNodeButton` custom edge (plus-on-edge insert) to the block canvas — reusing the already-built component.
2. Expand `NodeConfigPanel` to cover all node types fully (currently missing: `HOVER`, `UPLOAD_FILE`, `BACK`, `REFRESH`, `LOOP`, `IF_CONDITION`, `VARIABLE`, `API_REQUEST`).
3. Fix the `FitScreenIcon` button in the toolbar to actually call `fitView()` via `useReactFlow`.

**Expected Outcomes**
- Hovering over any edge in the Block Editor shows the `+` button and opens the insert popup.
- All node types show appropriate config fields when selected in the inspector.
- The fit-view toolbar button actually fits the canvas view.

**Todo List**
1. Import `AddNodeButton` and `addNodeButtonEdgeTypes` from the existing component; register them in `BlockCanvasInner`'s `edgeTypes`; update `defaultEdgeOptions` to `type: 'addable'`; update `onConnect` to set `type: 'addable'`.
2. Add an `insertNodeOnEdge` handler to `BlockEditor` (same logic as the store action but operating on local `nodes`/`edges` state); pass it down to `BlockCanvasInner` so `AddNodeButton` can call it.
3. Expand `NodeConfigPanel` to add fields for all missing node types:
   - `HOVER`, `UPLOAD_FILE`: selector field (already present for CLICK group — just add these types to the condition)
   - `LOOP`: count field (integer)
   - `IF_CONDITION`: condition expression field (string)
   - `VARIABLE`: variable name + value fields
   - `API_REQUEST`: url + method + body fields
   - `BACK`, `REFRESH`: no config needed — show a "No configuration required" message
4. Fix the FitScreen button: lift `fitView` from `useReactFlow()` in `BlockCanvasInner` and pass it up via a callback prop to `BlockEditor`'s toolbar.

**Relevant Context**
- `frontend/src/components/workflow/AddNodeButton.tsx` — already built, exports default component
- `frontend/src/components/workflow/InsertNodePopup.tsx` — already built
- `frontend/src/pages/BlockEditor.tsx` — `BlockCanvasNode` (line 53), `NodeConfigPanel` (line 100), `BlockCanvasInner` (line 159), toolbar (line 435)
- `frontend/src/store/workflowStore.ts` — `insertNodeOnEdge` action for reference implementation

**Status** — `[ ] pending`

---

### Sub-Task 4 — Block Dashboard Enhancements

**Intent**  
Improve the `BlockList` page to make the block dashboard more useful: add a "preview" of nodes count, add direct "Use in Workflow" quick action, and update the empty state to mention both creation paths (manual and recording).

**Expected Outcomes**
- Each block card shows the node count from its current version.
- An "Open in Editor" button on each card navigates to `/blocks/:id/edit`.
- Empty state copy mentions recording as a creation method.

**Todo List**
1. Update `GET /api/blocks` response usage: the `BlockResponse` schema already includes `versions` with nodes — read `versions[0].nodes.length` (or fetch from definition endpoint) for the count. Since the list endpoint returns `versions` as a list, show `block.versions?.[0]?.nodes?.length ?? 0` as node count.
2. Add "Open in Editor" `IconButton` next to the existing Edit button on each card.
3. Update empty state description copy to mention recording.

**Relevant Context**
- `frontend/src/pages/BlockList.tsx` — block card rendering lines 155–279
- Backend: `BlockResponse` schema includes `versions: List[BlockVersionResponse]` where each version has `nodes: List[Dict]`

**Status** — `[ ] pending`

---

## Implementation Order

```
Sub-Task 1 (Selection-to-Block)  →  Sub-Task 2 (Recording in Block Editor)  →  Sub-Task 3 (Block Editor UI)  →  Sub-Task 4 (Dashboard)
```

Sub-Tasks 3 and 4 are independent and can be done in any order after Sub-Task 2.

---

## Key Design Decisions

- **No backend changes needed** — all four sub-tasks work entirely with the existing API.
- **`replaceSelectionWithBlock`** in the store must handle the edge reconnection carefully: edges whose source OR target is inside the selection but whose OTHER end is outside must be re-pointed to the new BLOCK node.
- **AddNodeButton in BlockEditor** needs a local `insertNodeOnEdge` handler (not the Zustand store action) because the Block Editor manages its own `nodes`/`edges` state with `useState` rather than Zustand.
- **Recording in Block Editor** maps recorded nodes to `type: 'blockNode'` (not `type: 'custom'`) so the block canvas renders them with `BlockCanvasNode`.
