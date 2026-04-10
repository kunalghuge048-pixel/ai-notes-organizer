// ============================================================
// MindMapTab.jsx — Clean hierarchical tree mind map (SVG)
// Layout: Left-to-right tree, rectangular nodes, clear hierarchy
// ============================================================

import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { getMindmap } from "../../utils/api";

const BRANCH_COLORS = [
  "#00e5ff", "#b06eff", "#00ffa3", "#ffb300",
  "#ff6b6b", "#4ecdc4", "#a8e6cf", "#ffd93d",
];

const NODE_W = 140;
const NODE_H = 40;
const H_GAP  = 80;   // horizontal gap between levels
const V_GAP  = 14;   // vertical gap between siblings

// ── Layout engine ────────────────────────────────────────────
function calcLayout(node, depth = 0, colorIdx = 0) {
  const color = depth === 0 ? "#ffffff" : BRANCH_COLORS[colorIdx % BRANCH_COLORS.length];
  const result = { ...node, depth, color, x: depth * (NODE_W + H_GAP), y: 0, children: [] };

  if (!node.children?.length) {
    result._h = NODE_H;
    return result;
  }

  let childColorIdx = depth === 0 ? 0 : colorIdx;
  result.children = node.children.map((child, i) => {
    const c = calcLayout(child, depth + 1, depth === 0 ? i : childColorIdx);
    return c;
  });

  // Stack children vertically
  let totalHeight = result.children.reduce((s, c) => s + c._h, 0)
    + V_GAP * (result.children.length - 1);
  result._h = Math.max(NODE_H, totalHeight);

  // Assign y positions
  let y = 0;
  result.children.forEach(child => {
    child._offsetY = y + child._h / 2 - NODE_H / 2;
    y += child._h + V_GAP;
  });

  return result;
}

function positionNodes(node, baseY = 0) {
  node.y = baseY + (node._h / 2 - NODE_H / 2);
  node.cx = node.x + NODE_W / 2;
  node.cy = node.y + NODE_H / 2;

  if (node.children?.length) {
    let curY = baseY;
    node.children.forEach(child => {
      positionNodes(child, curY);
      curY += child._h + V_GAP;
    });
  }
  return node;
}

function flattenNodes(node, list = []) {
  list.push(node);
  node.children?.forEach(c => flattenNodes(c, list));
  return list;
}

function buildEdges(node, edges = []) {
  node.children?.forEach(child => {
    edges.push({
      x1: node.cx + NODE_W / 2,
      y1: node.cy,
      x2: child.cx - NODE_W / 2,
      y2: child.cy,
      color: child.color,
    });
    buildEdges(child, edges);
  });
  return edges;
}

export default function MindMapTab({ notes }) {
  const [tree, setTree]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom]         = useState(0.85);
  const [pan, setPan]           = useState({ x: 30, y: 30 });
  const [dragging, setDragging] = useState(false);
  const dragRef                 = useRef(null);

  const { nodes, edges, totalW, totalH } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [], totalW: 0, totalH: 0 };
    const laid  = calcLayout(tree);
    const posed = positionNodes(laid, 0);
    const flat  = flattenNodes(posed);
    const edges = buildEdges(posed);
    const maxX  = Math.max(...flat.map(n => n.x)) + NODE_W + 40;
    const maxY  = Math.max(...flat.map(n => n.y)) + NODE_H + 40;
    return { nodes: flat, edges, totalW: maxX, totalH: maxY };
  }, [tree]);

  async function generate() {
    if (!notes) { toast.error("Upload notes first"); return; }
    setLoading(true);
    try {
      const res = await getMindmap(notes.text);
      setTree(res.data.mindmap);
      setSelected(null);
      setZoom(0.85);
      setPan({ x: 30, y: 30 });
      toast.success("Mind map generated!");
    } catch (e) {
      toast.error("Failed to generate mind map");
    } finally { setLoading(false); }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindmap.json";
    a.click();
  }

  function onMouseDown(e) {
    if (e.target.closest("[data-node]")) return;
    setDragging(true);
    dragRef.current = { mx: e.clientX - pan.x, my: e.clientY - pan.y };
  }
  function onMouseMove(e) {
    if (!dragging || !dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.mx, y: e.clientY - dragRef.current.my });
  }
  function onMouseUp() { setDragging(false); dragRef.current = null; }
  function onWheel(e) {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
  }

  if (!notes) return (
    <div style={S.center}>
      <span style={{ fontSize: 48 }}>🧠</span>
      <p style={{ color: "var(--text-secondary)" }}>Upload notes to generate a mind map</p>
    </div>
  );
  if (loading) return (
    <div style={S.center}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        style={{ fontSize: 48 }}>🧠</motion.div>
      <p style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>Mapping knowledge...</p>
    </div>
  );
  if (!tree) return (
    <div style={S.center}>
      <span style={{ fontSize: 48 }}>🧠</span>
      <p style={{ color: "var(--text-secondary)" }}>Visualize your notes as a mind map</p>
      <button className="btn btn-primary" onClick={generate}>⚡ Generate Mind Map</button>
    </div>
  );

  const selNode = selected !== null ? nodes.find(n => n === selected) : null;

  return (
    <div style={S.container}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          🧠 {nodes.length} nodes — drag to pan · scroll to zoom
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setZoom(z => Math.min(z + 0.15, 2.5))}>+ Zoom</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))}>- Zoom</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setZoom(0.85); setPan({ x: 30, y: 30 }); }}>↺ Reset</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={exportJSON}>↓ JSON</button>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={generate}>↻ Regenerate</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ ...S.canvas, cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onWheel={onWheel}>
        <svg
          width="100%" height="100%"
          style={{ overflow: "visible", position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            {BRANCH_COLORS.map((c, i) => (
              <filter key={i} id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* Edges — curved bezier paths */}
            {edges.map((e, i) => {
              const mx = (e.x1 + e.x2) / 2;
              return (
                <path key={`e-${i}`}
                  d={`M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.45}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const isSelected = selected === node;
              const isRoot     = node.depth === 0;
              const w = isRoot ? NODE_W + 20 : NODE_W;
              const h = isRoot ? NODE_H + 8  : NODE_H;
              const rx = isRoot ? 20 : node.depth === 1 ? 10 : 6;
              const nx = node.cx - w / 2;
              const ny = node.cy - h / 2;

              return (
                <g key={`n-${i}`} data-node="1"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(isSelected ? null : node)}>

                  {/* Shadow/glow on select */}
                  {isSelected && (
                    <rect x={nx - 3} y={ny - 3} width={w + 6} height={h + 6}
                      rx={rx + 2} fill="none"
                      stroke={node.color} strokeWidth={2} strokeOpacity={0.6}
                      filter={`blur(4px)`}
                    />
                  )}

                  {/* Node box */}
                  <rect
                    x={nx} y={ny} width={w} height={h} rx={rx}
                    fill={isRoot
                      ? `rgba(255,255,255,0.08)`
                      : `${node.color}18`}
                    stroke={node.color}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeOpacity={isSelected ? 1 : 0.6}
                  />

                  {/* Label */}
                  <foreignObject x={nx + 6} y={ny + 2} width={w - 12} height={h - 4}
                    style={{ pointerEvents: "none" }}>
                    <div xmlns="http://www.w3.org/1999/xhtml"
                      style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        textAlign: "center",
                        fontSize: isRoot ? 13 : node.depth === 1 ? 11 : 10,
                        fontWeight: isRoot ? 700 : node.depth === 1 ? 600 : 400,
                        color: isRoot ? "#ffffff" : node.color,
                        lineHeight: 1.2,
                        fontFamily: isRoot ? "var(--font-display)" : "var(--font-body)",
                        wordBreak: "break-word",
                        overflow: "hidden",
                      }}>
                      {node.name}
                    </div>
                  </foreignObject>

                  {/* Depth indicator dot */}
                  {node.depth === 1 && (
                    <circle cx={nx + 8} cy={ny + h / 2} r={3}
                      fill={node.color} opacity={0.8} />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div style={S.legend}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          Depth: 
        </span>
        {["Root", "Branch", "Leaf"].map((label, d) => (
          <span key={d} style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: d === 0 ? 3 : 2,
              background: d === 0 ? "rgba(255,255,255,0.15)" : BRANCH_COLORS[d === 1 ? 0 : 2],
              opacity: 0.7,
            }} />
            {label}
          </span>
        ))}
      </div>

      {/* Selected node info */}
      {selNode && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={S.nodePanel} className="glass">
          <span style={{ color: selNode.color, fontWeight: 600, fontSize: 13 }}>
            {selNode.name}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Level {selNode.depth}
            {selNode.children?.length ? ` · ${selNode.children.length} children` : " · leaf node"}
          </span>
          <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}
            onClick={() => setSelected(null)}>✕</button>
        </motion.div>
      )}
    </div>
  );
}

const S = {
  center: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, height: "100%" },
  container: { display: "flex", flexDirection: "column", height: "100%", position: "relative", overflow: "hidden" },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap", gap: 8 },
  canvas: { flex: 1, overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 30% 50%, rgba(0,229,255,0.02) 0%, transparent 60%)" },
  legend: { display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 },
  nodePanel: { position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, minWidth: 260 },
};
