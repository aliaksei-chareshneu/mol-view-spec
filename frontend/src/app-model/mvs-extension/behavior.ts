/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';
import { CustomStructureProperty } from 'molstar/lib/mol-model-props/common/custom-structure-property';
import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior/behavior';
import { StructureRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { AnnotationColorThemeProvider } from './additions/annotation-color-theme';
import { AnnotationLabelRepresentationProvider } from './additions/annotation-label/representation';
import { AnnotationsProvider } from './additions/annotation-prop';
import { AnnotationTooltipsLabelProvider, AnnotationTooltipsProvider } from './additions/annotation-tooltips-prop';
import { CustomLabelRepresentationProvider } from './additions/custom-label/representation';
import { CustomTooltipsLabelProvider, CustomTooltipsProvider } from './additions/custom-tooltips-prop';
import { makeMultilayerColorThemeProvider } from './additions/multilayer-color-theme';


/** Registers a ton of stuff related to loading MolViewSpec files */
export const MolViewSpec = PluginBehavior.create<{ autoAttach: boolean }>({
    name: 'molviewspec',
    category: 'misc',
    display: {
        name: 'MolViewSpec',
        description: 'MolViewSpec extension'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean }> {
        private readonly customModelProperties: CustomModelProperty.Provider<any, any>[] = [
            AnnotationsProvider,
        ];
        private readonly customStructureProperties: CustomStructureProperty.Provider<any, any>[] = [
            CustomTooltipsProvider,
            AnnotationTooltipsProvider,
        ];
        private readonly representations: StructureRepresentationProvider<any>[] = [
            CustomLabelRepresentationProvider,
            AnnotationLabelRepresentationProvider,
        ];
        private readonly colorThemes: ColorTheme.Provider[] = [
            AnnotationColorThemeProvider,
            makeMultilayerColorThemeProvider(this.ctx.representation.structure.themes.colorThemeRegistry),
        ];
        private readonly lociLabelProviders: LociLabelProvider[] = [
            CustomTooltipsLabelProvider,
            AnnotationTooltipsLabelProvider,
        ];

        register(): void {
            for (const prop of this.customModelProperties) {
                this.ctx.customModelProperties.register(prop, this.params.autoAttach);
            }
            for (const prop of this.customStructureProperties) {
                this.ctx.customStructureProperties.register(prop, this.params.autoAttach);
            }
            for (const repr of this.representations) {
                this.ctx.representation.structure.registry.add(repr);
            }
            for (const theme of this.colorThemes) {
                this.ctx.representation.structure.themes.colorThemeRegistry.add(theme);
            }
            for (const provider of this.lociLabelProviders) {
                this.ctx.managers.lociLabels.addProvider(provider);
            }
        }
        update(p: { autoAttach: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            for (const prop of this.customModelProperties) {
                this.ctx.customModelProperties.setDefaultAutoAttach(prop.descriptor.name, this.params.autoAttach);
            }
            for (const prop of this.customStructureProperties) {
                this.ctx.customStructureProperties.setDefaultAutoAttach(prop.descriptor.name, this.params.autoAttach);
            }
            return updated;
        }
        unregister() {
            for (const prop of this.customModelProperties) {
                this.ctx.customModelProperties.unregister(prop.descriptor.name);
            }
            for (const prop of this.customStructureProperties) {
                this.ctx.customStructureProperties.unregister(prop.descriptor.name);
            }
            for (const repr of this.representations) {
                this.ctx.representation.structure.registry.remove(repr);
            }
            for (const theme of this.colorThemes) {
                this.ctx.representation.structure.themes.colorThemeRegistry.remove(theme);
            }
            for (const labelProvider of this.lociLabelProviders) {
                this.ctx.managers.lociLabels.removeProvider(labelProvider);
            }
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
    })
});
