export const SUNO_PRESET_CONFIG = [
  { promptKey: 'suno_preset_anthem', titleKey: 'suno_preset_anthem_title', model: 'suno/V6' },
  { promptKey: 'suno_preset_nightdrive', titleKey: 'suno_preset_nightdrive_title', model: 'suno/V6_MINI' },
  { promptKey: 'suno_preset_intro', titleKey: 'suno_preset_intro_title', model: 'suno/V6_WILD' },
] as const;

export const SUNO_BENEFIT_CONFIG = [
  { titleKey: 'suno_benefit_quality_title', descKey: 'suno_benefit_quality_desc', label: 'Suno V6' },
  { titleKey: 'suno_benefit_length_title', descKey: 'suno_benefit_length_desc', label: 'Suno V6 Mini' },
  { titleKey: 'suno_benefit_workflow_title', descKey: 'suno_benefit_workflow_desc', label: 'Prompt to Track' },
] as const;
