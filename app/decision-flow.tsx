'use client';

import { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnNodeDrag,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { FactorEdge, FactorNode, FactorType } from '../lib/types';

const typeGlyph: Record<FactorType, string> = {
  objective: '◎', assumption: '?', dependency: '◇', constraint: '◆', risk: '△', mitigation: '✦', outcome: '●', shock: '⚡',
};

const X_SCALE = 10.8;
const Y_SCALE = 7.4;
const X_OFFSET = 34;
const Y_OFFSET = 72;

type FactorFlowData = { factor: FactorNode };
type FactorFlowNode = Node<FactorFlowData, 'factor'>;

const toPosition = (factor: FactorNode) => ({
  x: factor.x * X_SCALE + X_OFFSET,
  y: factor.y * Y_SCALE + Y_OFFSET,
});

const fromPosition = (position: { x: number; y: number }) => ({
  x: Math.round(((position.x - X_OFFSET) / X_SCALE) * 10) / 10,
  y: Math.round(((position.y - Y_OFFSET) / Y_SCALE) * 10) / 10,
});

const FactorCardNode = memo(function FactorCardNode({ data, selected }: NodeProps<FactorFlowNode>) {
  const factor = data.factor;
  return (
    <div className={`factor-node ${factor.type} ${factor.status} ${selected ? 'selected-node' : ''}`}>
      <Handle type="target" position={Position.Left} className="factor-handle" />
      <span className="node-topline"><span>{typeGlyph[factor.type]} {factor.type}</span>{factor.locked && <b title="Human locked">◆</b>}</span>
      <strong>{factor.label}</strong>
      <small>{factor.status === 'draft' ? 'Agent proposal · review' : `${Math.round(factor.confidence * 100)}% confidence`}</small>
      <Handle type="source" position={Position.Right} className="factor-handle" />
    </div>
  );
});

const nodeTypes = { factor: FactorCardNode };

function mapNodes(factors: FactorNode[], selectedId: string): FactorFlowNode[] {
  return factors.map((factor) => ({
    id: factor.id,
    type: 'factor',
    position: toPosition(factor),
    data: { factor },
    selected: factor.id === selectedId,
    ariaLabel: `${factor.type}: ${factor.label}. Drag to reposition.`,
  }));
}

function mapEdges(edges: FactorEdge[], selectedId: string): Edge[] {
  return edges.map((edge) => {
    const selected = edge.sourceId === selectedId || edge.targetId === selectedId;
    const color = edge.relation === 'blocks' ? '#f05b54' : edge.status === 'draft' ? '#3157ff' : selected ? '#3157ff' : '#858b94';
    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      className: `${edge.relation === 'blocks' ? 'risk-edge' : ''} ${edge.status === 'draft' ? 'draft-edge' : ''} ${selected ? 'selected-edge' : ''}`,
      style: { stroke: color, strokeWidth: selected ? 2.4 : 1.55, strokeDasharray: edge.status === 'draft' ? '4 6' : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      interactionWidth: 18,
      selectable: false,
    };
  });
}

type DecisionFlowProps = {
  factors: FactorNode[];
  relationships: FactorEdge[];
  selectedId: string;
  onSelect: (factor: FactorNode) => void;
  onMove: (factorId: string, x: number, y: number) => void;
};

export default function DecisionFlow({ factors, relationships, selectedId, onSelect, onMove }: DecisionFlowProps) {
  const mappedNodes = useMemo(() => mapNodes(factors, selectedId), [factors, selectedId]);
  const mappedEdges = useMemo(() => mapEdges(relationships, selectedId), [relationships, selectedId]);
  const [nodes, setNodes, onNodesChange] = useNodesState<FactorFlowNode>(mappedNodes);

  useEffect(() => setNodes(mappedNodes), [mappedNodes, setNodes]);

  const handleNodeClick = useCallback<NodeMouseHandler<FactorFlowNode>>((_event, node) => {
    onSelect(node.data.factor);
  }, [onSelect]);

  const handleNodeDragStop = useCallback<OnNodeDrag<FactorFlowNode>>((_event, node) => {
    const position = fromPosition(node.position);
    onMove(node.id, position.x, position.y);
  }, [onMove]);

  return (
    <ReactFlow<FactorFlowNode, Edge>
      nodes={nodes}
      edges={mappedEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={handleNodeClick}
      onNodeDragStop={handleNodeDragStop}
      nodesConnectable={false}
      edgesReconnectable={false}
      deleteKeyCode={null}
      multiSelectionKeyCode={null}
      fitView
      fitViewOptions={{ padding: 0.17, minZoom: 0.55, maxZoom: 1.12 }}
      minZoom={0.35}
      maxZoom={1.6}
      zoomOnDoubleClick={false}
      colorMode="light"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#d7d2c7" />
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  );
}
