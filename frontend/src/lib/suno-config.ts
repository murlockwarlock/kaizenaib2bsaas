export const SUNO_PRESET_CONFIG = [
  { promptKey: 'suno_preset_anthem', titleKey: 'suno_preset_anthem_title', model: 'suno/V5' },
  { promptKey: 'suno_preset_nightdrive', titleKey: 'suno_preset_nightdrive_title', model: 'suno/V4_5PLUS' },
  { promptKey: 'suno_preset_intro', titleKey: 'suno_preset_intro_title', model: 'suno/V4_5' },
] as const;

export const SUNO_BENEFIT_CONFIG = [
  { titleKey: 'suno_benefit_quality_title', descKey: 'suno_benefit_quality_desc', label: 'Suno V5' },
  { titleKey: 'suno_benefit_length_title', descKey: 'suno_benefit_length_desc', label: 'Suno V4.5+' },
  { titleKey: 'suno_benefit_workflow_title', descKey: 'suno_benefit_workflow_desc', label: 'Prompt to Track' },
] as const;
