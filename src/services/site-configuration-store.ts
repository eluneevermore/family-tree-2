import {
  MAX_PERSON_HORIZONTAL_GAP,
  MAX_PERSON_NODE_HEIGHT,
  MAX_PERSON_NODE_WIDTH,
  MIN_PERSON_HORIZONTAL_GAP,
  MIN_PERSON_NODE_HEIGHT,
  MIN_PERSON_NODE_WIDTH,
  PERSON_HORIZONTAL_GAP,
  PERSON_NODE_HEIGHT,
  PERSON_NODE_WIDTH,
  STORAGE_SITE_CONFIGURATION_KEY
} from '../constants';
import { GraphConnectionStyle } from '../types';

export interface SiteConfiguration {
  readonly connectionStyle: GraphConnectionStyle;
  readonly personHorizontalGap: number;
  readonly personNodeHeight: number;
  readonly personNodeWidth: number;
}

const DEFAULT_CONNECTION_STYLE: GraphConnectionStyle = 'smoothstep';
const GRAPH_CONNECTION_STYLES: readonly GraphConnectionStyle[] = ['curve', 'smoothstep', 'straight', 'step'];

export interface SiteConfigurationStore {
  read(): SiteConfiguration;
  save(configuration: SiteConfiguration): void;
}

export class LocalStorageSiteConfigurationStore implements SiteConfigurationStore {
  constructor(private readonly storage: Storage) {}

  read(): SiteConfiguration {
    const storedValue = this.storage.getItem(STORAGE_SITE_CONFIGURATION_KEY);
    if (!storedValue) {
      return getDefaultConfiguration();
    }

    try {
      const parsedValue = JSON.parse(storedValue) as Partial<SiteConfiguration>;
      return {
        connectionStyle: normalizeGraphConnectionStyle(parsedValue.connectionStyle),
        personHorizontalGap: clampPersonHorizontalGap(parsedValue.personHorizontalGap),
        personNodeHeight: clampPersonNodeHeight(parsedValue.personNodeHeight),
        personNodeWidth: clampPersonNodeWidth(parsedValue.personNodeWidth)
      };
    } catch (error) {
      console.error('Failed to read site configuration from localStorage.', error);
      return getDefaultConfiguration();
    }
  }

  save(configuration: SiteConfiguration): void {
    this.storage.setItem(STORAGE_SITE_CONFIGURATION_KEY, JSON.stringify({
      connectionStyle: normalizeGraphConnectionStyle(configuration.connectionStyle),
      personHorizontalGap: clampPersonHorizontalGap(configuration.personHorizontalGap),
      personNodeHeight: clampPersonNodeHeight(configuration.personNodeHeight),
      personNodeWidth: clampPersonNodeWidth(configuration.personNodeWidth)
    }));
  }
}

export function clampPersonNodeWidth(width: number | undefined): number {
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return PERSON_NODE_WIDTH;
  }

  return Math.min(Math.max(width, MIN_PERSON_NODE_WIDTH), MAX_PERSON_NODE_WIDTH);
}

export function clampPersonNodeHeight(height: number | undefined): number {
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    return PERSON_NODE_HEIGHT;
  }

  return Math.min(Math.max(height, MIN_PERSON_NODE_HEIGHT), MAX_PERSON_NODE_HEIGHT);
}

export function clampPersonHorizontalGap(gap: number | undefined): number {
  if (typeof gap !== 'number' || !Number.isFinite(gap)) {
    return PERSON_HORIZONTAL_GAP;
  }

  return Math.min(Math.max(gap, MIN_PERSON_HORIZONTAL_GAP), MAX_PERSON_HORIZONTAL_GAP);
}

export function normalizeGraphConnectionStyle(value: unknown): GraphConnectionStyle {
  return GRAPH_CONNECTION_STYLES.includes(value as GraphConnectionStyle)
    ? value as GraphConnectionStyle
    : DEFAULT_CONNECTION_STYLE;
}

function getDefaultConfiguration(): SiteConfiguration {
  return {
    connectionStyle: DEFAULT_CONNECTION_STYLE,
    personHorizontalGap: PERSON_HORIZONTAL_GAP,
    personNodeHeight: PERSON_NODE_HEIGHT,
    personNodeWidth: PERSON_NODE_WIDTH
  };
}
