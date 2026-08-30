export type NullableText = string | null

export interface SourceVariant {
  rowNumber: number
  titlesBefore: NullableText
  titlesAfter: NullableText
  faculty: NullableText
  institution: string
  field: string
}
export interface FieldAlias {
  sourceLabel: string
  sourceKey: string
  targetLabel: string
  targetKey: string
}

export interface FieldCatalog {
  schemaVersion: 1
  aliases: FieldAlias[]
  labels: Record<string, string>
}


export interface Appointment {
  id: string
  name: string
  titlesBefore: NullableText
  titlesAfter: NullableText
  faculty: NullableText
  institutionId: string
  affiliationId: string
  institutionSource: string
  field: string
  fieldKey: string
  appointedOn: string
  presidentId: string
  sourceVariants: SourceVariant[]
}

export interface Institution {
  id: string
  shortName: string
  fullName: string
  sourceLabels: string[]
  citationUrl: string
}

export interface President {
  id: string
  name: string
  from: string
  to: string | null
  citationUrl: string
}

export interface ContextYear {
  year: number
  academicYear: string
  students: number
  graduates: number
  internalTeachers: number
  internalProfessors: number
  appointments: number
  population: number
  appointmentsPerMillionResidents: number
  professorsPer100kResidents: number
  appointmentsPer1kGraduates: number
  graduatesPerAppointment: number | null
  appointmentsPer10kStudents: number
  appointmentsPer1kTeachers: number
  appointmentsPer100Professors: number
  professorShare: number
}

export interface Affiliation {
  id: string
  institutionId: string
  facultyKeys: string[]
  status: 'resolved' | 'unresolved'
  city: string | null
  sourceUrl: string | null
  sourceLabel: string
  note: string | null
}

export interface City {
  name: string
  latitude: number
  longitude: number
  affiliationIds: string[]
}

export interface SourceMetadata {
  url: string
  sha256: string
  retrievedOn: string
}


export interface GraduateFieldYearSource extends SourceMetadata {
  year: number
  archiveMember: string | null
  localPath: string
}

export interface CurrentStudentFieldSource extends SourceMetadata {
  year: 2025
  archiveMember: null
  localPath: string
}

export interface FieldEducationYearMetadata {
  year: number
  programRowCount: number
  nationalGraduateCount: number
}

export interface FieldEducationRow {
  fieldKey: string
  canonicalLabel: string
  graduateCounts: Array<number | null>
  currentStudentCount: number | null
}

export interface FieldEducationComparison {
  schemaVersion: 2
  startYear: 2009
  endYear: 2025
  catalogUrl: string
  graduateSources: GraduateFieldYearSource[]
  currentStudentsSource: CurrentStudentFieldSource
  years: FieldEducationYearMetadata[]
  rows: FieldEducationRow[]
}

export interface PopulationSourceMetadata extends SourceMetadata {
  catalogUrl: string
  denominatorDateConvention: string
}


export interface AtlasSources {
  professors: SourceMetadata
  higher_education: SourceMetadata
  population: PopulationSourceMetadata
}

export interface AtlasMeta {
  schemaVersion: 1
  sourceRowCount: number
  duplicateSourceRowCount: number
  analyticalAppointmentCount: number
  ceremonyCount: number
  appointmentDateMin: string
  appointmentDateMax: string
}


export interface GeographyProperties {
  ADM0_A3: string
  ADMIN: string
  ISO_A2: string
  ISO_A3: string
  NAME: string
  NAME_EN: string
  license: string
  licenseUrl: string
  simplificationTolerance: number
  source: string
  sourceDataset: string
  sourceUrl: string
}

export interface AtlasGeography {
  type: 'Feature'
  bbox: [number, number, number, number]
  properties: GeographyProperties
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
}

export interface StudentPeakFact {
  year: number
  academicYear: string
  students: number
}

export interface GraduateThroughputPeakFact {
  year: number
  graduates: number
  statementSk: string
}

export interface AppointmentRateMaximumFact {
  year: number
  appointments: number
  students: number
  appointmentsPer10kStudents: number
}

export interface AppointmentGraduateRateMaximumFact {
  year: number
  appointments: number
  graduates: number
  appointmentsPer1kGraduates: number
  graduatesPerAppointment: number | null
  statementSk: string
}

export interface AppointmentProfessorStockRateMaximumFact {
  year: number
  appointments: number
  internalProfessors: number
  appointmentsPer100Professors: number
  statementSk: string
}

export interface LargestCeremonyFact {
  appointedOn: string
  appointments: number
}

export interface EditorialFacts {
  studentPeak: StudentPeakFact
  graduateThroughputPeak: GraduateThroughputPeakFact
  appointmentRateMaximum: AppointmentRateMaximumFact
  appointmentGraduateRateMaximum: AppointmentGraduateRateMaximumFact
  appointmentProfessorStockRateMaximum: AppointmentProfessorStockRateMaximumFact
  largestCeremony: LargestCeremonyFact
}

export interface AtlasData {
  meta: AtlasMeta
  sources: AtlasSources
  records: Appointment[]
  institutions: Institution[]
  affiliations: Affiliation[]
  cities: City[]
  presidents: President[]
  context: ContextYear[]
  fieldCatalog: FieldCatalog
  fieldEducationComparison: FieldEducationComparison
  geography: AtlasGeography
  editorialFacts: EditorialFacts
}
