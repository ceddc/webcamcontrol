import type { ImmutableObject } from 'seamless-immutable'

export interface Config {
  fingerColor: string
  panSensitivity: number
  zoomSensitivity: number
}

export type IMConfig = ImmutableObject<Config>
