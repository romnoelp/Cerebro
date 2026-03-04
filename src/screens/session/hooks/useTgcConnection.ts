// Re-exported from the use_cases layer.
// Note: return fields renamed — displayBandPowers (was liveData), rawBandPowers (was rawData).
// Note: EegSourceConfig.portName (was EegSource.port).
export type { EegSourceConfig as EegSource } from "@/use_cases/useEegListener";
export { useEegListener as useTgcConnection } from "@/use_cases/useEegListener";
