import React, { FC, useMemo } from 'react';
import { Select } from '@grafana/ui';
import {
  MapLayerConfig,
  DataFrame,
  MapLayerRegistryItem,
  PanelOptionsEditorBuilder,
  StandardEditorContext,
  FrameGeometrySourceMode,
  FieldType,
} from '@grafana/data';
import { geomapLayerRegistry } from '../layers/registry';
import { defaultGrafanaThemedMap } from '../layers/basemaps';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';
import { setOptionImmutably } from 'app/features/dashboard/components/PanelEditor/utils';
import { fillOptionsPaneItems } from 'app/features/dashboard/components/PanelEditor/getVizualizationOptions';

export interface LayerEditorProps<TConfig = any> {
  config?: MapLayerConfig<TConfig>;
  data: DataFrame[]; // All results
  onChange: (config: MapLayerConfig<TConfig>) => void;
  filter: (item: MapLayerRegistryItem) => boolean;
}

export const LayerEditor: FC<LayerEditorProps> = ({ config, onChange, data, filter }) => {
  // all basemaps
  const layerTypes = useMemo(() => {
    return geomapLayerRegistry.selectOptions(
      config?.type // the selected value
        ? [config.type] // as an array
        : [defaultGrafanaThemedMap.id],
      filter
    );
  }, [config?.type, filter]);

  // The options change with each layer type
  const optionsEditorBuilder = useMemo(() => {
    const layer = geomapLayerRegistry.getIfExists(config?.type);
    if (!layer || !layer.registerOptionsUI) {
      return null;
    }
    const builder = new PanelOptionsEditorBuilder();
    if (layer.showLocation) {
      builder
        .addRadio({
          path: 'location.mode',
          name: 'Location',
          description: '',
          defaultValue: FrameGeometrySourceMode.Auto,
          settings: {
            options: [
              { value: FrameGeometrySourceMode.Auto, label: 'Auto' },
              { value: FrameGeometrySourceMode.Coords, label: 'Coords' },
              { value: FrameGeometrySourceMode.Geohash, label: 'Geohash' },
            ],
          },
        })
        .addFieldNamePicker({
          path: 'location.latitude',
          name: 'Latitude Field',
          settings: {
            filter: (f) => f.type === FieldType.number,
            noFieldsMessage: 'No numeric fields found',
          },
          showIf: (opts: MapLayerConfig) => opts.location?.mode === FrameGeometrySourceMode.Coords,
        })
        .addFieldNamePicker({
          path: 'location.longitude',
          name: 'Longitude Field',
          settings: {
            filter: (f) => f.type === FieldType.number,
            noFieldsMessage: 'No numeric fields found',
          },
          showIf: (opts: MapLayerConfig) => opts.location?.mode === FrameGeometrySourceMode.Coords,
        })
        .addFieldNamePicker({
          path: 'location.geohash',
          name: 'Geohash Field',
          settings: {
            filter: (f) => f.type === FieldType.string,
            noFieldsMessage: 'No strings fields found',
          },
          showIf: (opts: MapLayerConfig) => opts.location?.mode === FrameGeometrySourceMode.Geohash,
          // eslint-disable-next-line react/display-name
          // info: (props) => <div>HELLO</div>,
        });
      // .addFieldNamePicker({
      //   path: 'fieldMapping.Field',
      //   name: 'Longitude Field',
      //   defaultValue: defaultOptions.fieldMapping.longitudeField,
      //   settings: {
      //     filter: (f) => f.type === FieldType.number,
      //     noFieldsMessage: 'No numeric fields found',
      //   },
      //   showIf: (config) =>
      //     config.queryFormat.locationType === 'coordinates',
      // })
      // .addFieldNamePicker({
      //   path: 'fieldMapping.geohashField',
      //   name: ' Field',
      //   defaultValue: defaultOptions.fieldMapping.geohashField,
      //   settings: {
      //     filter: (f) => f.type === FieldType.string,
      //     noFieldsMessage: 'No strings fields found',

      //   },
      //   showIf: (config) =>
      //     config.queryFormat.locationType === 'geohash',
      // })
    }
    layer.registerOptionsUI(builder);
    if (layer.showOpacity) {
      // TODO -- add opacity check
    }
    return builder;
  }, [config?.type]);

  // The react componnets
  const layerOptions = useMemo(() => {
    const layer = geomapLayerRegistry.getIfExists(config?.type);
    if (!optionsEditorBuilder || !layer) {
      return null;
    }

    const category = new OptionsPaneCategoryDescriptor({
      id: 'Layer config',
      title: 'Layer config',
    });

    const context: StandardEditorContext<any> = {
      data,
      options: config?.config,
    };

    const currentConfig = { ...layer.defaultOptions, ...config?.config };
    const reg = optionsEditorBuilder.getRegistry();

    // Load the options into categories
    fillOptionsPaneItems(
      reg.list(),

      // Always use the same category
      (categoryNames) => category,

      // Custom upate function
      (path: string, value: any) => {
        onChange({
          ...config,
          config: setOptionImmutably(currentConfig, path, value),
        } as MapLayerConfig);
      },
      context
    );

    return (
      <>
        <br />
        {category.items.map((item) => item.render())}
      </>
    );
  }, [optionsEditorBuilder, onChange, data, config]);

  return (
    <div>
      <Select
        options={layerTypes.options}
        value={layerTypes.current}
        onChange={(v) => {
          const layer = geomapLayerRegistry.getIfExists(v.value);
          if (!layer) {
            console.warn('layer does not exist', v);
            return;
          }
          onChange({
            type: layer.id,
            config: layer.defaultOptions, // clone?
          });
        }}
      />

      {layerOptions}
    </div>
  );
};
