"""SUBSTRATA CAD IR → CadQuery transpiler.

Walks a validated `CadIR` tree and produces a CadQuery `Workplane` per part.
The transpiler is intentionally small and explicit: each feature `op` is one
method on `IRTranspiler`. Adding a new op means adding one method, no
metaclasses.

The transpiler executes inside the same Modal container as the FastAPI route
— it is NOT a code generator. We never `exec()` model-emitted Python; we
consume a validated IR (Pydantic) and call CadQuery methods directly. That
keeps the worker safe even if the LLM gets creative.
"""

from __future__ import annotations
from typing import Dict, List
import cadquery as cq

from schema import (
    CadIR, CadPart, CadFeature,
    SketchFeature, ExtrudeFeature, RevolveFeature,
    FilletFeature, ChamferFeature, ShellFeature,
    BooleanFeature, PatternFeature, HolePatternFeature, TransformFeature,
    RectPrimitive, CirclePrimitive, PolygonPrimitive, SlotPrimitive,
)


class TranspileError(RuntimeError):
    pass


def _plane(plane: str) -> str:
    return {"XY": "XY", "XZ": "XZ", "YZ": "YZ"}[plane]


class IRTranspiler:
    """Walks one part's feature list, building up a CadQuery shape.

    `sketches` holds intermediate 2D shapes keyed by sketch id; `solids` holds
    intermediate 3D shapes keyed by feature id. The result of the part is the
    last 3D solid produced (or the named `target` of the last op).
    """

    def __init__(self, part: CadPart) -> None:
        self.part = part
        self.sketches: Dict[str, cq.Workplane] = {}
        self.solids: Dict[str, cq.Workplane] = {}
        self.last_id: str | None = None

    def transpile(self) -> cq.Workplane:
        for feature in self.part.features:
            self._dispatch(feature)
        if self.last_id is None or self.last_id not in self.solids:
            raise TranspileError(f"part '{self.part.id}' produced no solid")
        return self.solids[self.last_id]

    def _dispatch(self, feature: CadFeature) -> None:
        op = feature.op
        method = getattr(self, f"_op_{op}", None)
        if method is None:
            raise TranspileError(f"unsupported op: {op}")
        method(feature)

    # ── Sketch ─────────────────────────────────────────────────────────────
    def _op_sketch(self, f: SketchFeature) -> None:
        wp = cq.Workplane(_plane(f.plane)).workplane(offset=f.offset)
        for prim in f.primitives:
            if isinstance(prim, RectPrimitive):
                wp = wp.center(prim.origin[0], prim.origin[1]).rect(prim.width, prim.height)
            elif isinstance(prim, CirclePrimitive):
                wp = wp.center(prim.center[0], prim.center[1]).circle(prim.radius)
            elif isinstance(prim, PolygonPrimitive):
                wp = wp.polyline(list(prim.points)).close()
            elif isinstance(prim, SlotPrimitive):
                wp = wp.slot2D(_distance(prim.p1, prim.p2), prim.width, 0).moveTo(
                    (prim.p1[0] + prim.p2[0]) / 2, (prim.p1[1] + prim.p2[1]) / 2,
                )
            else:
                raise TranspileError(f"unknown sketch primitive: {prim.kind}")
        self.sketches[f.id] = wp

    # ── Extrude ────────────────────────────────────────────────────────────
    def _op_extrude(self, f: ExtrudeFeature) -> None:
        sketch = self.sketches.get(f.sketchId)
        if sketch is None:
            raise TranspileError(f"extrude '{f.id}' references unknown sketch '{f.sketchId}'")
        kwargs = {"taper": f.taperDeg} if f.taperDeg else {}
        if f.bothSides:
            solid = sketch.extrude(f.distance, both=True, **kwargs)
        else:
            solid = sketch.extrude(f.distance, **kwargs)
        self.solids[f.id] = solid
        self.last_id = f.id

    # ── Revolve ────────────────────────────────────────────────────────────
    def _op_revolve(self, f: RevolveFeature) -> None:
        sketch = self.sketches.get(f.sketchId)
        if sketch is None:
            raise TranspileError(f"revolve '{f.id}' references unknown sketch '{f.sketchId}'")
        axis_vec = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[f.axis]
        solid = sketch.revolve(f.angleDeg, axisStart=(0, 0, 0), axisEnd=axis_vec)
        self.solids[f.id] = solid
        self.last_id = f.id

    # ── Fillet / Chamfer ───────────────────────────────────────────────────
    def _select_edges(self, solid: cq.Workplane, edge_filter: str) -> cq.Workplane:
        if edge_filter == "all":
            return solid.edges()
        if edge_filter == "vertical":
            return solid.edges("|Z")
        if edge_filter == "horizontal":
            return solid.edges("|X or |Y")
        if edge_filter == "top":
            return solid.edges(">Z")
        if edge_filter == "bottom":
            return solid.edges("<Z")
        return solid.edges()

    def _op_fillet(self, f: FilletFeature) -> None:
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"fillet '{f.id}' references unknown solid '{f.target}'")
        result = self._select_edges(target, f.edgeFilter).fillet(f.radius)
        self.solids[f.id] = result
        self.last_id = f.id

    def _op_chamfer(self, f: ChamferFeature) -> None:
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"chamfer '{f.id}' references unknown solid '{f.target}'")
        result = self._select_edges(target, f.edgeFilter).chamfer(f.size)
        self.solids[f.id] = result
        self.last_id = f.id

    # ── Shell ──────────────────────────────────────────────────────────────
    def _op_shell(self, f: ShellFeature) -> None:
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"shell '{f.id}' references unknown solid '{f.target}'")
        face_selectors = {
            "top": ">Z", "bottom": "<Z",
            "left": "<X", "right": ">X",
            "front": "<Y", "back": ">Y",
        }
        if not f.openFaces:
            result = target.shell(f.thickness)
        else:
            sel = " or ".join(face_selectors[face] for face in f.openFaces)
            result = target.faces(sel).shell(f.thickness)
        self.solids[f.id] = result
        self.last_id = f.id

    # ── Boolean ────────────────────────────────────────────────────────────
    def _op_boolean(self, f: BooleanFeature) -> None:
        first = self.solids.get(f.targets[0])
        if first is None:
            raise TranspileError(f"boolean '{f.id}' references unknown solid '{f.targets[0]}'")
        result = first
        for other_id in f.targets[1:]:
            other = self.solids.get(other_id)
            if other is None:
                raise TranspileError(f"boolean '{f.id}' references unknown solid '{other_id}'")
            if f.mode == "union":
                result = result.union(other)
            elif f.mode == "difference":
                result = result.cut(other)
            elif f.mode == "intersection":
                result = result.intersect(other)
        self.solids[f.id] = result
        self.last_id = f.id

    # ── Hole pattern ───────────────────────────────────────────────────────
    def _op_holePattern(self, f: HolePatternFeature) -> None:
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"holePattern '{f.id}' references unknown solid '{f.target}'")
        wp = target.faces(">Z").workplane()
        for px, py in f.points:
            wp = wp.moveTo(px, py).hole(f.diameter, depth=f.depth)
        if f.countersink:
            for px, py in f.points:
                wp = wp.moveTo(px, py).cskHole(f.diameter, f.countersink.diameter, f.countersink.depth)
        self.solids[f.id] = wp
        self.last_id = f.id

    # ── Pattern ────────────────────────────────────────────────────────────
    def _op_pattern(self, f: PatternFeature) -> None:
        # Minimal first pass: linear/grid only. Polar requires axis math we
        # punt to a later revision.
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"pattern '{f.id}' references unknown solid '{f.target}'")
        sx, sy, sz = f.spacing
        if f.kind == "linear":
            result = target
            for i in range(1, f.count):
                shifted = target.translate((sx * i, sy * i, sz * i))
                result = result.union(shifted)
        elif f.kind == "grid":
            result = target
            cols = max(1, int(f.count ** 0.5))
            for i in range(f.count):
                row, col = divmod(i, cols)
                if i == 0:
                    continue
                shifted = target.translate((sx * col, sy * row, 0))
                result = result.union(shifted)
        elif f.kind == "polar":
            raise TranspileError("polar pattern not implemented yet")
        else:
            raise TranspileError(f"unknown pattern kind '{f.kind}'")
        self.solids[f.id] = result
        self.last_id = f.id

    # ── Transform ──────────────────────────────────────────────────────────
    def _op_transform(self, f: TransformFeature) -> None:
        target = self.solids.get(f.target)
        if target is None:
            raise TranspileError(f"transform '{f.id}' references unknown solid '{f.target}'")
        result = target.translate(f.translate)
        rx, ry, rz = f.rotateDeg
        if rx:
            result = result.rotate((0, 0, 0), (1, 0, 0), rx)
        if ry:
            result = result.rotate((0, 0, 0), (0, 1, 0), ry)
        if rz:
            result = result.rotate((0, 0, 0), (0, 0, 1), rz)
        sx, sy, sz = f.scale
        if sx != 1 or sy != 1 or sz != 1:
            tr = cq.Matrix()
            tr.scale(sx)
            result = result.val().transformShape(tr)
            result = cq.Workplane().add(result)
        self.solids[f.id] = result
        self.last_id = f.id


def _distance(p1, p2) -> float:
    return ((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2) ** 0.5


def transpile_ir(ir: CadIR) -> List[tuple[str, cq.Workplane]]:
    """Returns a list of (part_id, solid) tuples in part order."""
    return [(part.id, IRTranspiler(part).transpile()) for part in ir.parts]
