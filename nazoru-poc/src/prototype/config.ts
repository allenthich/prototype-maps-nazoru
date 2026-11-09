export interface LabConfig {
  mapOpen: boolean;
  pinRefresh: 'auto' | 'search';
  listRefresh: 'manual' | 'auto';
  pinAction: 'none' | 'preview' | 'sheet';
  clusterAction: 'zoom' | 'stores';
  clustering: 'proximity' | 'building';
  showContext: boolean;
  radius: boolean;
  trace: boolean;
  mapHeight: 'standard' | 'tall';
}

export const DEFAULT_CONFIG: LabConfig = {
  mapOpen: false, pinRefresh: 'auto', listRefresh: 'manual', pinAction: 'sheet',
  clusterAction: 'stores', clustering: 'proximity', showContext: true,
  radius: false, trace: false, mapHeight: 'standard',
};

export const PRESETS: Record<string, { label: string; description: string; config: LabConfig }> = {
  standard: { label: '標準', description: 'ピンは自動更新・一覧はボタンで更新', config: DEFAULT_CONFIG },
  live: { label: '自動検索', description: '地図を動かすとピンも一覧も更新', config: { ...DEFAULT_CONFIG, mapOpen: true, listRefresh: 'auto' } },
  tools: { label: '範囲指定を試す', description: '半径・なぞる・キーボードで範囲を指定', config: { ...DEFAULT_CONFIG, mapOpen: true, radius: true, trace: true } },
};

const CHOICES = {
  pinRefresh: ['auto', 'search'], listRefresh: ['manual', 'auto'],
  pinAction: ['none', 'preview', 'sheet'], clusterAction: ['zoom', 'stores'],
  clustering: ['proximity', 'building'], mapHeight: ['standard', 'tall'],
} as const;

export function readConfig(params: URLSearchParams): LabConfig {
  const presetId = params.get('preset') ?? 'standard';
  const preset = Object.hasOwn(PRESETS, presetId) ? PRESETS[presetId] : PRESETS.standard;
  const config = { ...preset.config };
  for (const key of ['mapOpen', 'showContext', 'radius', 'trace'] as const) {
    const value = params.get(`ui_${key}`);
    if (value === '0' || value === '1') config[key] = value === '1';
  }
  for (const key of Object.keys(CHOICES) as (keyof typeof CHOICES)[]) {
    const value = params.get(`ui_${key}`);
    if (value && (CHOICES[key] as readonly string[]).includes(value)) Object.assign(config, { [key]: value });
  }
  return config;
}

export function writeConfig(params: URLSearchParams, config: LabConfig): URLSearchParams {
  const output = new URLSearchParams(params);
  output.delete('preset');
  for (const [key, value] of Object.entries(config)) output.set(`ui_${key}`, typeof value === 'boolean' ? (value ? '1' : '0') : value);
  return output;
}
