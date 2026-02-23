# How to Create a Working ArcGIS Experience Builder Widget

This note is based on patterns from these 5 samples:

1. `sample/arcgis-experience-builder-sdk-resources/widgets/demo-function`
2. `sample/arcgis-experience-builder-sdk-resources/widgets/map-view`
3. `sample/arcgis-experience-builder-sdk-resources/widgets/feature-layer-function`
4. `sample/arcgis-experience-builder-sdk-resources/widgets/add-layers`
5. `sample/arcgis-experience-builder-sdk-resources/widgets/show-unit-tests`

## What "working" means

A widget is working when it:

- appears in the Experience Builder widget panel,
- can be dropped into a page,
- renders without runtime errors,
- can save and read settings/config,
- and (if used) connects to map/data sources correctly.

## 1) Put the widget in the correct folder

Inside your Experience Builder install, place custom widgets under:

`client/your-extensions/widgets/<your-widget-name>/`

The sample repo README also shows cloning into `client/sdk-sample` for reference samples.

## 2) Start with the minimum file structure

Use this structure as your base:

```text
<your-widget-name>/
  manifest.json
  config.json
  icon.svg
  src/
    config.ts
    runtime/
      widget.tsx
      translations/
        default.ts
    setting/
      setting.tsx
      translations/
        default.ts
```

The simplest working shape is shown by `demo-function`.

## 3) Create a valid `manifest.json`

At minimum, include:

- `name`, `label`, `type: "widget"`
- `version` and `exbVersion` matching your ExB version
- `defaultSize`
- `translatedLocales`

If you use map APIs/components, add map dependency info:

- `dependency: "jimu-arcgis"` (see `map-view`)
- `properties.canCreateMapView: true` if your widget creates a map view (see `map-view`)

Example:

```json
{
  "name": "my-widget",
  "label": "My Widget",
  "type": "widget",
  "version": "1.19.0",
  "exbVersion": "1.19.0",
  "translatedLocales": ["en"],
  "defaultSize": { "width": 400, "height": 300 }
}
```

## 4) Define config and runtime widget

Use immutable config typing like `demo-function` and `add-layers`.

`src/config.ts`:

```ts
import type { ImmutableObject } from 'jimu-core'

export interface Config {
  text: string
}

export type IMConfig = ImmutableObject<Config>
```

`config.json`:

```json
{
  "text": "Hello"
}
```

`src/runtime/widget.tsx` (minimal function widget):

```tsx
import { React, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

export default function Widget (props: AllWidgetProps<IMConfig>) {
  return (
    <div className='jimu-widget'>
      {props.config?.text}
    </div>
  )
}
```

## 5) Add a settings panel (so authors can configure it)

From `demo-function`, the key pattern is `onSettingChange`.

`src/setting/setting.tsx`:

```tsx
import { React } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const onTextChange = (evt: React.FormEvent<HTMLInputElement>) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set('text', evt.currentTarget.value)
    })
  }

  return <input defaultValue={props.config.text} onChange={onTextChange} />
}
```

## 6) Connect to a map (two common patterns)

### Pattern A: Attach to an existing map widget (`add-layers`)

- In settings, use `MapWidgetSelector` and save `useMapWidgetIds`.
- In runtime, render `JimuMapViewComponent` and capture `onActiveViewChange`.

Use this when your widget interacts with another map widget.

### Pattern B: Build a map view from a WebMap data source (`map-view`)

- In settings, use `DataSourceSelector` restricted to `WebMap`.
- In runtime, wrap UI in `DataSourceComponent`.
- On data source creation, build a map view via `MapViewManager.createJimuMapView(...)`.

Use this when your widget itself owns/creates the view.

## 7) Query feature data source (`feature-layer-function`)

For data-driven widgets:

- Settings:
  - use `DataSourceSelector` with `DataSourceTypes.FeatureLayer`
  - use `FieldSelector` to choose one or more fields
- Runtime:
  - keep query state (`where`, `outFields`, `pageSize`)
  - render through `DataSourceComponent`
  - check status with `DataSourceStatus.Loaded` before reading records

This is the standard ExB pattern for querying and rendering records.

## 8) Lazy-load ArcGIS JS API only when needed (`add-layers`)

If your widget needs ArcGIS JS API classes (for example `FeatureLayer`), load them inside an action handler:

```ts
loadArcGISJSAPIModules(['esri/layers/FeatureLayer']).then(([FeatureLayer]) => {
  // use module
})
```

This keeps startup lighter and avoids loading modules before user action.

## 9) Add unit tests (`show-unit-tests`)

Use `jimu-for-test` helpers:

- `widgetRender()` and `wrapWidget(...)`
- mock ArcGIS module loading with `jest.mock('jimu-core', ...)`
- test render, props/state mapping, click events, and async API behavior

This sample is a good template for tests that touch ExB props and ArcGIS module calls.

## 10) Practical build checklist

1. Create widget folder under `client/your-extensions/widgets/`.
2. Add `manifest.json`, `config.json`, `src/runtime/widget.tsx`.
3. Add `src/setting/setting.tsx` and wire `onSettingChange`.
4. If map/data is needed, wire `MapWidgetSelector` or `DataSourceSelector`.
5. Start Experience Builder and verify the widget appears and renders.
6. If you added tests, run `npm run test` in `client`.

## Common failure points to avoid

- ExB version mismatch between your install and `manifest.json`.
- Missing `dependency: "jimu-arcgis"` for map-related widgets.
- No selected data source/map widget in settings, so runtime has nothing to use.
- Reading records before data source status is loaded.
- Not calling `onSettingChange`, so config changes never persist.
