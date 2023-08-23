from __future__ import annotations

from typing import Sequence, TypedDict, Type

from molviewspec.nodes import (
    CameraParams,
    CanvasParams,
    ColorCifCategoryParams,
    ColorInlineParams,
    ColorT,
    ColorUrlParams,
    ComponentExpression,
    ComponentParams,
    ComponentSelectorT,
    DownloadParams,
    FocusInlineParams,
    LabelCifCategoryParams,
    LabelInlineParams,
    LabelUrlParams,
    LineParams,
    Node,
    ParseFormatT,
    ParseParams,
    RepresentationParams,
    RepresentationTypeT,
    SchemaFormatT,
    SchemaT,
    SphereParams,
    State,
    StructureParams,
    TooltipCifCategoryParams,
    TooltipInlineParams,
    TooltipUrlParams,
    TransformParams,
)
from molviewspec.params_utils import make_params


VERSION = 5


def create_builder() -> Root:
    return Root()


def _assign_params(params: TypedDict, type: Type[TypedDict], lcs: TypedDict):
    for k in type.__annotations__.keys():
        if k in lcs and lcs.get(k) is not None:
            params[k] = lcs.get(k)


class _Base:
    _root: Root
    _node: Node

    def __init__(self, *, root: Root, node: Node) -> None:
        self._root = root
        self._node = node

    def _add_child(self, node: Node) -> None:
        if "children" not in self._node:
            self._node["children"] = []
        self._node["children"].append(node)


class Root(_Base):
    def __init__(self) -> None:
        super().__init__(root=self, node=Node(kind="root"))

    def get_state(self) -> State:
        return State(version=VERSION, root=self._node)

    def camera(
        self,
        *,
        position: tuple[float, float, float] | None,
        direction: tuple[float, float, float] | None,
        radius: float | None,
    ):
        params = make_params(CameraParams, locals())
        node = Node(kind="camera", params=params)
        self._add_child(node)
        return self

    def canvas(self, *, background_color: ColorT | None = None) -> "Root":
        lcs = locals()
        params: CanvasParams = {}
        _assign_params(params, CanvasParams, lcs)
        node = Node(kind="canvas", params=params)
        self._add_child(node)
        return self

    def download(self, *, url: str) -> Download:
        node = Node(kind="download", params=DownloadParams(url=url))
        self._add_child(node)
        return Download(node=node, root=self._root)

    def generic_visuals(self) -> "GenericVisuals":
        node = Node(kind="generic-visuals")
        self._add_child(node)
        return GenericVisuals(node=node, root=self._root)

    # TODO Root inherit from _Base and have special __init__ with `self.root = self`? (to be able to use `add_child` in `download`)


class Download(_Base):
    # TODO defaults in signature makes them more obvious to users but this can't accommodate more complex cases
    def parse(self, *, format: ParseFormatT) -> Parse:
        params = make_params(ParseParams, locals())
        node = Node(kind="parse", params=params)
        self._add_child(node)
        return Parse(node=node, root=self._root)


class Parse(_Base):
    def model_structure(
        self,
        *,
        model_index: int | None = None,  # TODO default candidate
        block_index: int | None = None,  # TODO default candidate
        block_header: str | None = None,
    ) -> "Structure":
        """
        Create a structure for the deposited coordinates.
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        params = make_params(StructureParams, locals(), kind="model")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def assembly_structure(
        self,
        *,
        assembly_id: str | None = None,
        assembly_index: int | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create an assembly structure.
        :param assembly_id: Use the name to specify which assembly to load
        :param assembly_index: 0-based assembly index, use this to load the 1st assembly
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        if assembly_id is None and assembly_index is None:
            assembly_index = 0
        params = make_params(StructureParams, locals(), kind="assembly")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_structure(
        self,
        *,
        ijk_min: tuple[int, int, int] | None = None,
        ijk_max: tuple[int, int, int] | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices
        :param ijk_max: Top-right Miller indices
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "symmetry"}
        _assign_params(params, StructureParams, lcs)
        if ijk_min is None:
            params["ijk_min"] = (-1, -1, -1)
        if ijk_max is None:
            params["ijk_max"] = (1, 1, 1)
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_mate_structure(
        self,
        *,
        radius: float | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "symmetry-mates"}
        _assign_params(params, StructureParams, lcs)
        if radius is None:
            params["radius"] = 5.0
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)


class Structure(_Base):
    def component(
        self, *, selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all"
    ) -> Structure:
        params: ComponentParams = {"selector": selector}
        node = Node(kind="component", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def label(self, *, text: str) -> Structure:
        lcs = locals()
        params: LabelInlineParams = {}
        _assign_params(params, LabelInlineParams, lcs)
        node = Node(kind="label", params=params)
        self._add_child(node)
        return self

    def label_from_url(
        self,
        *,
        url: str,
        format: SchemaFormatT,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        lcs = locals()
        params: LabelUrlParams = {}
        _assign_params(params, LabelUrlParams, lcs)
        node = Node(kind="label-from-url", params=params)
        self._add_child(node)
        return self

    def label_from_cif(
        self,
        *,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        lcs = locals()
        params: LabelCifCategoryParams = {}
        _assign_params(params, LabelCifCategoryParams, lcs)
        node = Node(kind="label-from-cif", params=params)
        self._add_child(node)
        return self

    def tooltip(self, *, text: str) -> Structure:
        lcs = locals()
        params: TooltipInlineParams = {}
        _assign_params(params, TooltipInlineParams, lcs)
        node = Node(kind="tooltip", params=params)
        self._add_child(node)
        return self

    def tooltip_from_url(
        self,
        *,
        url: str,
        format: SchemaFormatT,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        lcs = locals()
        params: TooltipUrlParams = {}
        _assign_params(params, TooltipUrlParams, lcs)
        node = Node(kind="tooltip-from-url", params=params)
        self._add_child(node)
        return self

    def tooltip_from_cif(
        self,
        *,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        lcs = locals()
        params: TooltipCifCategoryParams = {}
        _assign_params(params, TooltipCifCategoryParams, lcs)
        node = Node(kind="tooltip-from-cif", params=params)
        self._add_child(node)
        return self

    def focus(self) -> Structure:
        """
        Focus on this structure or component.
        :return: this builder
        """
        # TODO other focus flavors based on CIF/JSON?
        lcs = locals()
        params: FocusInlineParams = {}
        _assign_params(params, FocusInlineParams, lcs)
        node = Node(kind="focus", params=params)
        self._add_child(node)
        return self

    def transform(
        self,
        *,
        transformation: Sequence[float],
        rotation: Sequence[float],
        translation: tuple[float, float, float],
    ) -> Structure:
        transformation = tuple(transformation)
        if len(transformation) != 16:
            raise ValueError(f"Parameter `transformation` must have length 16")
        rotation = tuple(rotation)
        if len(rotation) != 9:
            raise ValueError(f"Parameter `rotation` must have length 9")
        translation = tuple(translation)
        if len(translation) != 3:
            raise ValueError(f"Parameter `translation` must have length 3")
        lcs = locals()
        params: TransformParams = {}
        _assign_params(params, TransformParams, lcs)
        node = Node(kind="transform", params=params)
        self._add_child(node)
        return self

    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT | None = None) -> Representation:
        lcs = locals()
        params: RepresentationParams = {}
        _assign_params(params, RepresentationParams, lcs)
        node = Node(kind="representation", params=params)
        self._add_child(node)
        return Representation(node=node, root=self._root)


class Representation(_Base):
    def color_from_cif(self, *, schema: SchemaT, category_name: str) -> Representation:
        lcs = locals()
        params: ColorCifCategoryParams = {}
        _assign_params(params, ColorCifCategoryParams, lcs)
        node = Node(kind="color-from-cif", params=params)
        self._add_child(node)
        return self

    def color_from_url(self, *, schema: SchemaT, url: str, format: str) -> "Representation":
        lcs = locals()
        params: ColorUrlParams = {}
        _assign_params(params, ColorUrlParams, lcs)
        node = Node(kind="color-from-url", params=params)
        self._add_child(node)
        return self

    def color(self, *, color: ColorT) -> Representation:
        lcs = locals()
        params: ColorInlineParams = {}
        _assign_params(params, ColorInlineParams, lcs)
        node = Node(kind="color", params=params)
        self._add_child(node)
        return self


class GenericVisuals(_Base):
    def sphere(
        self,
        *,
        position: tuple[float, float, float],
        radius: float,
        color: ColorT,
        label: str | None = None,
        tooltip: str | None = None,
    ) -> "GenericVisuals":
        lcs = locals()
        params: SphereParams = {}
        _assign_params(params, SphereParams, lcs)
        node = Node(kind="sphere", params=params)
        self._add_child(node)
        return self

    def line(
        self,
        *,
        position1: tuple[float, float, float],
        position2: tuple[float, float, float],
        radius: float,
        color: ColorT,
        label: str | None = None,
        tooltip: str | None = None,
    ) -> "GenericVisuals":
        lcs = locals()
        params: LineParams = {}
        _assign_params(params, LineParams, lcs)
        node = Node(kind="line", params=params)
        self._add_child(node)
        return self
