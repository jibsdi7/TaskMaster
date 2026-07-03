import { useState, useCallback, useRef, useEffect } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import InsertNodePopup from './InsertNodePopup';
import { useWorkflowStore } from '../../store/workflowStore';
import { NodeTemplate } from './nodeTemplates';

// Inject shared CSS once — handles the button's hide/show animation
if (typeof document !== 'undefined' && !document.getElementById('add-node-btn-style')) {
  const s = document.createElement('style');
  s.id = 'add-node-btn-style';
  s.textContent = `
    .add-node-btn {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: all;
    }
    .add-node-btn.visible {
      opacity: 1 !important;
      transform: translate(-50%, -50%) scale(1) !important;
    }
    .add-node-btn:hover {
      box-shadow: 0 0 0 5px rgba(25, 118, 210, 0.22) !important;
    }
  `;
  document.head.appendChild(s);
}

interface AddNodeButtonProps extends EdgeProps {
  data?: {
    extraNodes?: NodeTemplate[];
    onInsertNodeOnEdge?: (edgeId: string, nodeType: string, label: string, blockId?: number) => void;
  };
}

const AddNodeButton = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: AddNodeButtonProps) => {
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);
  const popupOpenRef = useRef(false);
  const storeInsert = useWorkflowStore((s) => s.insertNodeOnEdge);
  // Allow the parent to override the insert handler via edge data (e.g. BlockEditor uses local state)
  const insertNodeOnEdge = data?.onInsertNodeOnEdge ?? storeInsert;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const popupOpen = Boolean(popupAnchor);

  // Keep a ref in sync so our imperative helpers always read the current value
  useEffect(() => {
    popupOpenRef.current = popupOpen;
  }, [popupOpen]);

  // ---- Imperative show/hide helpers ----------------------------------------
  // EdgeLabelRenderer portals its output outside the SVG, so CSS parent-selectors
  // can't span the SVG ↔ HTML boundary. We bridge the gap by imperatively
  // toggling a CSS class on the button element.

  const getBtn = useCallback(
    () => document.querySelector<HTMLElement>(`[data-edge-id="${id}"]`),
    [id]
  );

  const showBtn = useCallback(() => {
    getBtn()?.classList.add('visible');
  }, [getBtn]);

  const hideBtn = useCallback(() => {
    if (!popupOpenRef.current) getBtn()?.classList.remove('visible');
  }, [getBtn]);

  // ---- Event handlers -------------------------------------------------------

  const handlePlusClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setPopupAnchor(e.currentTarget);
    },
    []
  );

  const handlePopupClose = useCallback(() => {
    setPopupAnchor(null);
    // Small delay so mouse-leave doesn't race with popup closing
    setTimeout(() => getBtn()?.classList.remove('visible'), 50);
  }, [getBtn]);

  const handleNodeSelect = useCallback(
    (nodeType: string, label: string, blockId?: number) => {
      insertNodeOnEdge(id, nodeType, label, blockId);
    },
    [id, insertNodeOnEdge]
  );

  return (
    <>
      {/* SVG layer: visible edge path + wide transparent hover hit-area */}
      <g onMouseEnter={showBtn} onMouseLeave={hideBtn}>
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
        />
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      </g>

      {/* HTML layer: ➕ button, portalled via EdgeLabelRenderer */}
      <EdgeLabelRenderer>
        <button
          data-edge-id={id}
          className="add-node-btn nodrag nopan"
          onClick={handlePlusClick}
          onMouseEnter={showBtn}
          onMouseLeave={hideBtn}
          title="Insert node here"
          style={{
            position: 'absolute',
            left: labelX,
            top: labelY,
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '2px solid #1976d2',
            backgroundColor: '#141414',
            color: '#ffffff',
            cursor: 'pointer',
            padding: 0,
            fontSize: 20,
            lineHeight: '22px',
            fontWeight: 700,
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          +
        </button>
      </EdgeLabelRenderer>

      <InsertNodePopup
        anchorEl={popupAnchor}
        open={popupOpen}
        onClose={handlePopupClose}
        onSelect={handleNodeSelect}
        extraNodes={data?.extraNodes ?? []}
      />
    </>
  );
};

export default AddNodeButton;

// Made with Bob
