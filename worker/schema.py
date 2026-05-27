"""Pydantic schema for the SUBSTRATA CAD IR.

Mirrors src/lib/cadEngines/ir.ts on the TypeScript side. The IR is what Gemini
emits and what the transpiler consumes — keep the two in sync.
"""

from __future__ import annotations
from typing import List, Literal, Optional, Tuple, Union
from pydantic import BaseModel, Field, conlist

Vec2 = Tuple[float, float]
Vec3 = Tuple[float, float, float]
Plane = Literal["XY", "XZ", "YZ"]
Axis = Literal["X", "Y", "Z"]


class RectPrimitive(BaseModel):
    kind: Literal["rect"]
    origin: Vec2
    width: float
    height: float


class CirclePrimitive(BaseModel):
    kind: Literal["circle"]
    center: Vec2
    radius: float


class PolygonPrimitive(BaseModel):
    kind: Literal["polygon"]
    points: conlist(Vec2, min_length=3)


class SlotPrimitive(BaseModel):
    kind: Literal["slot"]
    p1: Vec2
    p2: Vec2
    width: float


class EllipsePrimitive(BaseModel):
    kind: Literal["ellipse"]
    center: Vec2
    rx: float
    ry: float
    rotationDeg: float = 0.0


class ArcPrimitive(BaseModel):
    kind: Literal["arc"]
    center: Vec2
    radius: float
    startDeg: float
    endDeg: float


class BezierControl(BaseModel):
    anchor: Vec2
    h1: Vec2
    h2: Vec2


class BezierPrimitive(BaseModel):
    kind: Literal["bezier"]
    controls: conlist(BezierControl, min_length=2)


SketchPrimitive = Union[
    RectPrimitive, CirclePrimitive, EllipsePrimitive,
    PolygonPrimitive, SlotPrimitive, ArcPrimitive, BezierPrimitive,
]


class SketchFeature(BaseModel):
    op: Literal["sketch"]
    id: str
    plane: Plane = "XY"
    offset: float = 0.0
    primitives: conlist(SketchPrimitive, min_length=1)


class ExtrudeFeature(BaseModel):
    op: Literal["extrude"]
    id: str
    sketchId: str
    distance: float
    taperDeg: float = 0.0
    bothSides: bool = False


class RevolveFeature(BaseModel):
    op: Literal["revolve"]
    id: str
    sketchId: str
    axis: Axis = "Z"
    angleDeg: float = 360.0


EdgeFilter = Literal["all", "vertical", "horizontal", "top", "bottom"]


class FilletFeature(BaseModel):
    op: Literal["fillet"]
    id: str
    target: str
    radius: float
    edgeFilter: EdgeFilter = "all"


class ChamferFeature(BaseModel):
    op: Literal["chamfer"]
    id: str
    target: str
    size: float
    edgeFilter: EdgeFilter = "all"


OpenFace = Literal["top", "bottom", "left", "right", "front", "back"]


class ShellFeature(BaseModel):
    op: Literal["shell"]
    id: str
    target: str
    thickness: float
    openFaces: List[OpenFace] = Field(default_factory=list)


class BooleanFeature(BaseModel):
    op: Literal["boolean"]
    id: str
    mode: Literal["union", "difference", "intersection"]
    targets: conlist(str, min_length=2)


class PatternFeature(BaseModel):
    op: Literal["pattern"]
    id: str
    target: str
    kind: Literal["linear", "polar", "grid"]
    count: int = Field(gt=0)
    spacing: Vec3 = (0.0, 0.0, 0.0)
    axis: Axis = "Z"


class CountersinkSpec(BaseModel):
    diameter: float
    depth: float


class HolePatternFeature(BaseModel):
    op: Literal["holePattern"]
    id: str
    target: str
    diameter: float
    depth: Optional[float] = None
    points: conlist(Vec2, min_length=1)
    plane: Plane = "XY"
    countersink: Optional[CountersinkSpec] = None


class TransformFeature(BaseModel):
    op: Literal["transform"]
    id: str
    target: str
    translate: Vec3 = (0.0, 0.0, 0.0)
    rotateDeg: Vec3 = (0.0, 0.0, 0.0)
    scale: Vec3 = (1.0, 1.0, 1.0)


class MirrorFeature(BaseModel):
    op: Literal["mirror"]
    id: str
    target: str
    plane: Plane = "YZ"
    keepOriginal: bool = True


class LoftFeature(BaseModel):
    op: Literal["loft"]
    id: str
    sketchIds: conlist(str, min_length=2)
    ruled: bool = False
    closed: bool = False


class SweepFeature(BaseModel):
    op: Literal["sweep"]
    id: str
    profileSketchId: str
    pathSketchId: str
    twistDegPerUnit: float = 0.0
    multisection: bool = False


CadFeature = Union[
    SketchFeature,
    ExtrudeFeature,
    RevolveFeature,
    FilletFeature,
    ChamferFeature,
    ShellFeature,
    BooleanFeature,
    PatternFeature,
    HolePatternFeature,
    TransformFeature,
    MirrorFeature,
    LoftFeature,
    SweepFeature,
]


class CadPart(BaseModel):
    id: str
    name: str
    material: Optional[str] = None
    color: Optional[str] = None
    features: conlist(CadFeature, min_length=1)


class CadIR(BaseModel):
    units: Literal["mm", "inch"] = "mm"
    parts: conlist(CadPart, min_length=1)
    assemblyNotes: Optional[str] = None


class GenerateRequest(BaseModel):
    """Client request body sent to /generate/{engine}."""
    prompt: str
    engine: Literal["cadquery", "text2cad"]
    mode: Literal["maker", "architecture", "hacker"] = "maker"
    units: Literal["mm", "inch"] = "mm"
    designStyle: Optional[str] = None
    printer: Optional[str] = None
    referenceImage: Optional[str] = None
    advisorContext: Optional[str] = None
    constraints: Optional[dict] = None


class ValidationFinding(BaseModel):
    severity: Literal["info", "warn", "error"]
    code: str
    message: str
    partId: Optional[str] = None
    featureId: Optional[str] = None


class CadArtifact(BaseModel):
    kind: Literal["step", "stl", "glb", "obj", "openscad", "cadquery_py", "source"]
    url: Optional[str] = None
    inline: Optional[str] = None
    bytes: Optional[int] = None
    sha256: Optional[str] = None


class GenerateResponse(BaseModel):
    engine: Literal["cadquery", "text2cad"]
    ok: bool
    ir: Optional[dict] = None
    sourceCode: Optional[str] = None
    artifacts: List[CadArtifact] = Field(default_factory=list)
    validation: List[ValidationFinding] = Field(default_factory=list)
    logs: List[str] = Field(default_factory=list)
    warmupMs: Optional[float] = None
    generationMs: Optional[float] = None
