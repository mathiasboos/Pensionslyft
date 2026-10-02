// Minimal stand-in for Framer's "framer" module, used only for the local
// preview and type checking. Inside Framer the real module is used.

export const ControlType = {
  Boolean: "boolean",
  Number: "number",
  String: "string",
  Color: "color",
  Font: "font",
  Link: "link",
  Enum: "enum",
  Object: "object",
} as const;

export type ControlType = (typeof ControlType)[keyof typeof ControlType];

export type PropertyControls = Record<string, Record<string, unknown> & { type: ControlType }>;

export function addPropertyControls(_component: unknown, _controls: PropertyControls): void {}
