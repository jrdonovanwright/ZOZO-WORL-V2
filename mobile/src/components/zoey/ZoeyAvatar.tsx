/**
 * ZoeyAvatar — backward-compatible wrapper around ZoeyCharacter.
 *
 * New code should use ZoeyCharacter directly for access to the full
 * state machine (9 states, lip sync, eye tracking).
 */
export { ZoeyAvatar, type ZoeyMood } from "./ZoeyCharacter";
