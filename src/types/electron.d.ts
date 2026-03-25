import type {
  PersonalInformation,
  MilitaryService,
  VaDisabilityInfo,
  DisabilityClaim,
  SecondaryCondition,
  Document,
  PacketStatus,
} from './database'

interface ElectronAPI {
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    getAll: () => Promise<Record<string, string>>
  }
  formData: {
    getPersonalInfo: () => Promise<PersonalInformation | null>
    savePersonalInfo: (data: Partial<PersonalInformation>) => Promise<PersonalInformation>
    getMilitaryService: () => Promise<MilitaryService | null>
    saveMilitaryService: (data: Partial<MilitaryService>) => Promise<MilitaryService>
    getVaDisabilityInfo: () => Promise<VaDisabilityInfo | null>
    saveVaDisabilityInfo: (data: Partial<VaDisabilityInfo>) => Promise<VaDisabilityInfo>
    getDisabilityClaims: () => Promise<DisabilityClaim[]>
    createDisabilityClaim: (data: Partial<DisabilityClaim>) => Promise<DisabilityClaim>
    updateDisabilityClaim: (id: string, data: Partial<DisabilityClaim>) => Promise<DisabilityClaim>
    deleteDisabilityClaim: (id: string) => Promise<void>
    getSecondaryConditions: (claimId: string) => Promise<SecondaryCondition[]>
    createSecondaryCondition: (data: Partial<SecondaryCondition>) => Promise<SecondaryCondition>
    deleteSecondaryCondition: (id: string) => Promise<void>
    getDocuments: () => Promise<Document[]>
    createDocument: (data: Partial<Document>) => Promise<Document>
    deleteDocument: (id: string) => Promise<void>
    getPacketStatus: () => Promise<PacketStatus[]>
    updatePacketStep: (stepName: string, status: string) => Promise<PacketStatus>
    resetPacketStatus: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
