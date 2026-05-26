import {
  MAX_PERSON_NODE_WIDTH,
  MIN_PERSON_NODE_WIDTH,
  PERSON_NODE_WIDTH,
  STORAGE_SITE_CONFIGURATION_KEY
} from '../constants';

export interface SiteConfiguration {
  readonly personNodeWidth: number;
}

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
        personNodeWidth: clampPersonNodeWidth(parsedValue.personNodeWidth)
      };
    } catch (error) {
      console.error('Failed to read site configuration from localStorage.', error);
      return getDefaultConfiguration();
    }
  }

  save(configuration: SiteConfiguration): void {
    this.storage.setItem(STORAGE_SITE_CONFIGURATION_KEY, JSON.stringify({
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

function getDefaultConfiguration(): SiteConfiguration {
  return {
    personNodeWidth: PERSON_NODE_WIDTH
  };
}
