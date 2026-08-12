export const LEGAL_DOCS = {
  terms: { document: "terms_of_service", version: "0.1" },
  privacy: { document: "privacy_policy", version: "0.1" },
} as const;

export type LegalDocKey = keyof typeof LEGAL_DOCS;
