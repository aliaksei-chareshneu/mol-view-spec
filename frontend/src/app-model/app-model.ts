import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { Node, ParseNode, RootNode } from './view-spec/nodes';
import { dfs } from './view-spec/utils';
import { Download } from 'molstar/lib/mol-plugin-state/transforms/data';



export class AppModel {
    plugin?: PluginUIContext;

    async initPlugin(target: HTMLDivElement) {
        const defaultSpec = DefaultPluginUISpec();
        this.plugin = await createPluginUI(target, {
            ...defaultSpec,
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: true,  // original: false
                    controlsDisplay: 'landscape',  // original: not given
                },
            },
            components: {
                // controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' },
                controls: { right: 'none', top: 'none', bottom: 'none' },
            },
            canvas3d: {
                camera: {
                    helper: { axes: { name: 'off', params: {} } }
                }
            },
            config: [
                [PluginConfig.Viewport.ShowExpand, true],  // original: false
                [PluginConfig.Viewport.ShowControls, true],  // original: false
                [PluginConfig.Viewport.ShowSelectionMode, false],
                [PluginConfig.Viewport.ShowAnimation, false],
            ],
        });
    }

    public async foo() {
        console.log('foo', this.plugin);
        if (!this.plugin) return;
        this.plugin.behaviors.layout.leftPanelTabName.next('data');
        const raw = await this.plugin.build().toRoot().apply(Download, { isBinary: true, url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn.bcif' }).commit();
        // await this.plugin.build().to(raw).apply();

        const x: ParseNode = undefined as any;
        const exampleUrl = 'http://localhost:9000/api/v1/examples/load/1tqn';
        const response = await fetch(exampleUrl);
        const data = await response.json() as RootNode;
        if (data.kind !== 'root') throw new Error('FormatError');
        console.log(data);
        const update = this.plugin.build();
        const m = new Map<Node, any>();
        dfs(data, (node, parent) => {
            console.log('Visit', node, '<-', parent);
            if (node.kind === 'root') {
                const msRoot = update.toRoot().selector;
                update.delete(msRoot);
                m.set(node, msRoot);
            } else {
                if (!parent) throw new Error('FormatError');;
                const msTarget = m.get(parent);
                let msNode;
                switch (node.kind) {
                    // case 'download':
                    //     node.url;
                }
                // update.to(msTarget).apply(Download)
                m.set(node, parent);
            }
        });
        console.log(m);
    }
}
