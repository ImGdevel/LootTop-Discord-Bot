export interface CardBuildResult {
  flags?: number;
  components: DiscordComponent[];
}

export interface ButtonSpec {
  label: string;
  customId?: string;
  style?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
  url?: string;
}

export type DiscordComponent =
  | DiscordTextDisplay
  | DiscordSeparator
  | DiscordContainer
  | DiscordSection
  | DiscordButton;

export interface DiscordTextDisplay {
  type: 10;
  content: string;
}

export interface DiscordSeparator {
  type: 14;
  divider: boolean;
  spacing: 1 | 2;
}

export interface DiscordContainer {
  type: 17;
  components: DiscordComponent[];
  accent_color?: number;
}

export interface DiscordSection {
  type: 9;
  components: [DiscordTextDisplay, DiscordButton?] | [DiscordTextDisplay];
}

export interface DiscordButton {
  type: 2;
  style: 1 | 2 | 3 | 4 | 5;
  label: string;
  custom_id?: string;
  disabled?: boolean;
  url?: string;
}

export function textBlock(markdown: string): DiscordTextDisplay {
  return {
    type: 10,
    content: markdown,
  };
}

export function separator(spacing: 1 | 2 = 1): DiscordSeparator {
  return {
    type: 14,
    divider: true,
    spacing,
  };
}

export function button(spec: ButtonSpec): DiscordButton {
  return {
    type: 2,
    style: spec.style ?? (spec.url ? 5 : 1),
    label: spec.label,
    custom_id: spec.customId,
    disabled: spec.disabled,
    url: spec.url,
  };
}

export function section(markdown: string, accessory?: DiscordButton): DiscordSection {
  return {
    type: 9,
    components: accessory ? [textBlock(markdown), accessory] : [textBlock(markdown)],
  };
}

export function container(
  children: DiscordComponent[],
  accentColor?: number
): DiscordContainer {
  return {
    type: 17,
    components: children,
    accent_color: accentColor,
  };
}
