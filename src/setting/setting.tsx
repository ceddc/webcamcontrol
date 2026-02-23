import { React, css } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import defaultMessages from './translations/default'

const DEFAULT_FINGER_COLOR = '#00ff88'
const DEFAULT_PAN_SENSITIVITY = 2.1
const DEFAULT_ZOOM_SENSITIVITY = 2.5

const style = css`
  .webcamcontrol-setting-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
    font-size: 13px;
  }

  .webcamcontrol-setting-range {
    width: 180px;
  }

  .webcamcontrol-setting-value {
    min-width: 42px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const formatMessage = props.intl.formatMessage

  const onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds
    })
  }

  const onFingerColorChange = (evt: React.FormEvent<HTMLInputElement>) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set('fingerColor', evt.currentTarget.value)
    })
  }

  const onPanSensitivityChange = (evt: React.FormEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(evt.currentTarget.value)
    props.onSettingChange({
      id: props.id,
      config: props.config.set('panSensitivity', Number.isFinite(nextValue) ? nextValue : DEFAULT_PAN_SENSITIVITY)
    })
  }

  const onZoomSensitivityChange = (evt: React.FormEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(evt.currentTarget.value)
    props.onSettingChange({
      id: props.id,
      config: props.config.set('zoomSensitivity', Number.isFinite(nextValue) ? nextValue : DEFAULT_ZOOM_SENSITIVITY)
    })
  }

  const fingerColor = props.config.fingerColor ?? DEFAULT_FINGER_COLOR
  const panSensitivity = props.config.panSensitivity ?? DEFAULT_PAN_SENSITIVITY
  const zoomSensitivity = props.config.zoomSensitivity ?? DEFAULT_ZOOM_SENSITIVITY

  return (
    <div className='p-2' css={style}>
      <SettingSection
        title={formatMessage({
          id: 'mapSection',
          defaultMessage: defaultMessages.mapSection
        })}
      >
        <SettingRow>
          <MapWidgetSelector onSelect={onMapWidgetSelected} useMapWidgetIds={props.useMapWidgetIds} />
        </SettingRow>
      </SettingSection>

      <SettingSection
        title={formatMessage({
          id: 'behaviorSection',
          defaultMessage: defaultMessages.behaviorSection
        })}
      >
        <SettingRow>
          <label className='webcamcontrol-setting-label'>
            <span>
              {formatMessage({
                id: 'fingerColor',
                defaultMessage: defaultMessages.fingerColor
              })}
            </span>
            <input type='color' value={fingerColor} onChange={onFingerColorChange} />
          </label>
        </SettingRow>

        <SettingRow>
          <label className='webcamcontrol-setting-label'>
            <span>
              {formatMessage({
                id: 'panSensitivity',
                defaultMessage: defaultMessages.panSensitivity
              })}
            </span>
            <input
              className='webcamcontrol-setting-range'
              type='range'
              min='1'
              max='4'
              step='0.1'
              value={panSensitivity}
              onChange={onPanSensitivityChange}
            />
            <span className='webcamcontrol-setting-value'>{panSensitivity.toFixed(1)}x</span>
          </label>
        </SettingRow>

        <SettingRow>
          <label className='webcamcontrol-setting-label'>
            <span>
              {formatMessage({
                id: 'zoomSensitivity',
                defaultMessage: defaultMessages.zoomSensitivity
              })}
            </span>
            <input
              className='webcamcontrol-setting-range'
              type='range'
              min='1'
              max='4'
              step='0.1'
              value={zoomSensitivity}
              onChange={onZoomSensitivityChange}
            />
            <span className='webcamcontrol-setting-value'>{zoomSensitivity.toFixed(1)}x</span>
          </label>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
