/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
// import { VisualUpdateState } from '../../../mol-repr/util';
// import { VisualContext } from '../../../mol-repr/visual';
import { Model, Structure, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
// import { Theme } from '../../../mol-theme/theme';
import { Text } from 'molstar/lib/mol-geo/geometry/text/text';
import { TextBuilder } from 'molstar/lib/mol-geo/geometry/text/text-builder';
// import { ComplexTextVisual, ComplexTextParams, ComplexVisual } from '../complex-visual';
import { ElementIterator, eachSerialElement, getSerialElementLoci } from 'molstar/lib/mol-repr/structure/visual/util/element';
// import { ColorNames } from '../../../mol-util/color/names';
// import { Vec3 } from '../../../mol-math/linear-algebra';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { Sphere3D } from 'molstar/lib/mol-math/geometry';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { ComplexTextVisual, ComplexVisual } from 'molstar/lib/mol-repr/structure/complex-visual';
import * as Original from 'molstar/lib/mol-repr/structure/visual/label-text';
import { VisualUpdateState } from 'molstar/lib/mol-repr/util';
import { VisualContext } from 'molstar/lib/mol-repr/visual';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { UUID, deepEqual } from 'molstar/lib/mol-util';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { AtomRanges, rangesMap } from '../helpers/atom-ranges';
import { IndicesAndSortings, createIndicesAndSortings } from '../helpers/indexing';
import { atomQualifies, getAtomRangesForRow } from '../helpers/selections';
import { AnnotationRow } from '../helpers/schemas';
import { PD_MaybeInteger, PD_MaybeString } from '../helpers/param-definition';
import { extend, omitObjectKeys } from '../../utils';
import { textPropsForSelection } from '../helpers/label-text';


export const CustomLabelTextParams = {
    items: PD.ObjectList(
        {
            text: PD.Text('¯\\_(ツ)_/¯'),
            position: PD.MappedStatic('selection', {
                x_y_z: PD.Group({
                    x: PD.Numeric(0),
                    y: PD.Numeric(0),
                    z: PD.Numeric(0),
                    scale: PD.Numeric(1, { min: 0, max: 20, step: 0.1 })
                }),
                selection: PD.Group({
                    label_entity_id: PD_MaybeString(),
                    label_asym_id: PD_MaybeString(),
                    auth_asym_id: PD_MaybeString(),

                    label_seq_id: PD_MaybeInteger(),
                    auth_seq_id: PD_MaybeInteger(),
                    pdbx_PDB_ins_code: PD_MaybeString(),
                    /** Minimum label_seq_id (inclusive) */
                    beg_label_seq_id: PD_MaybeInteger(undefined, { description: 'Minimum label_seq_id (inclusive)' }),
                    /** Maximum label_seq_id (inclusive) */
                    end_label_seq_id: PD_MaybeInteger(),
                    /** Minimum auth_seq_id (inclusive) */
                    beg_auth_seq_id: PD_MaybeInteger(),
                    /** Maximum auth_seq_id (inclusive) */
                    end_auth_seq_id: PD_MaybeInteger(),

                    /** Atom name like 'CA', 'N', 'O'... */
                    label_atom_id: PD_MaybeString(),
                    /** Atom name like 'CA', 'N', 'O'... */
                    auth_atom_id: PD_MaybeString(),
                    /** Element symbol like 'H', 'HE', 'LI', 'BE'... */
                    type_symbol: PD_MaybeString(),
                    /** Unique atom identifier across conformations (_atom_site.id) */
                    atom_id: PD_MaybeInteger(),
                    /** 0-base index of the atom in the source data */
                    atom_index: PD_MaybeInteger(),

                }),
            }),
        },
        obj => obj.text,
        { isEssential: true }
    ),
    ...omitObjectKeys(Original.LabelTextParams, ['level', 'chainScale', 'residueScale', 'elementScale']),
    borderColor: { ...Original.LabelTextParams.borderColor, defaultValue: ColorNames.black }, // TODO probably remove this (what if black background)
    // ...ComplexTextParams,
    // background: PD.Boolean(false),
    // backgroundMargin: PD.Numeric(0, { min: 0, max: 1, step: 0.01 }),
    // backgroundColor: PD.Color(ColorNames.black),
    // backgroundOpacity: PD.Numeric(0.5, { min: 0, max: 1, step: 0.01 }),
    // borderWidth: PD.Numeric(0.25, { min: 0, max: 0.5, step: 0.01 }),
    // level: PD.Select('residue', [['chain', 'Chain'], ['residue', 'Residue'], ['element', 'Element']] as const, { isEssential: true }),
    // chainScale: PD.Numeric(10, { min: 0, max: 20, step: 0.1 }),
    // residueScale: PD.Numeric(1, { min: 0, max: 20, step: 0.1 }),
    // elementScale: PD.Numeric(0.5, { min: 0, max: 20, step: 0.1 }),
};
// export const CustomLabelTextParams = Original.LabelTextParams;

export type CustomLabelTextParams = typeof CustomLabelTextParams
export type CustomLabelTextProps = PD.Values<CustomLabelTextParams>
// export type CustomLabelLevels = CustomLabelTextProps['level']

export function CustomLabelTextVisual(materialId: number): ComplexVisual<CustomLabelTextParams> {
    return ComplexTextVisual<CustomLabelTextParams>({
        defaultProps: PD.getDefaultValues(CustomLabelTextParams),
        createGeometry: createLabelText,
        createLocationIterator: ElementIterator.fromStructure,
        getLoci: getSerialElementLoci,
        eachLocation: eachSerialElement,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<CustomLabelTextParams>, currentProps: PD.Values<CustomLabelTextParams>) => {
            state.createGeometry = !deepEqual(newProps.items, currentProps.items);
            // state.createGeometry = newProps.text !== currentProps.text;
            // state.createGeometry ||= newProps.x !== currentProps.x;
            // state.createGeometry ||= newProps.y !== currentProps.y;
            // state.createGeometry ||= newProps.z !== currentProps.z;
        }
    }, materialId);
}

const tmpVec = Vec3();

function createLabelText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const count = props.items.length;
    const builder = TextBuilder.create(props, count, count / 2, text);
    for (const item of props.items) {
        let scale: number;
        switch (item.position.name) {
            case 'x_y_z':
                Vec3.set(tmpVec, item.position.params.x, item.position.params.y, item.position.params.z);
                scale = item.position.params.scale;
                builder.add(item.text, tmpVec[0], tmpVec[1], tmpVec[2], scale, scale, 0);
                break;
            case 'selection':
                // console.time('addLabelItem');
                const p = textPropsForSelection(structure, theme.size.size, item.position.params);
                if (p) builder.add(item.text, p.center[0], p.center[1], p.center[2], p.radius, p.scale, p.group);
                // console.timeEnd('addLabelItem');
                break;
        }
    }

    return builder.getText();
}
