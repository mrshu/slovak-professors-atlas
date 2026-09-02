import type {
  Affiliation,
  Appointment,
  City,
  ContextYear,
  Institution,
  President,
} from '../data/types'

let sequence = 0

export function appointment(
  overrides: Partial<Appointment> & Pick<Appointment, 'appointedOn'>,
): Appointment {
  sequence += 1
  return {
    id: `apt-${sequence}`,
    name: 'Jana Nováková',
    titlesBefore: 'doc. Ing.',
    titlesAfter: 'PhD.',
    faculty: 'Prírodovedecká fakulta',
    institutionId: 'uniba',
    affiliationId: 'uniba-default',
    institutionSource: 'UK v Bratislave',
    field: 'fyzika',
    fieldKey: 'fyzika',
    presidentId: 'gasparovic',
    sourceVariants: [],
    ...overrides,
  }
}

export function institution(overrides: Partial<Institution> = {}): Institution {
  return {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://www.wikidata.org/wiki/Q332881',
    ...overrides,
  }
}

export function affiliation(overrides: Partial<Affiliation> = {}): Affiliation {
  return {
    id: 'uniba-default',
    institutionId: 'uniba',
    facultyKeys: [],
    status: 'resolved',
    city: 'Bratislava',
    sourceUrl: null,
    sourceLabel: 'Kanonické sídlo inštitúcie',
    note: null,
    ...overrides,
  }
}

export function city(overrides: Partial<City> = {}): City {
  return {
    name: 'Bratislava',
    latitude: 48.1486,
    longitude: 17.1077,
    affiliationIds: ['uniba-default'],
    ...overrides,
  }
}

export function president(overrides: Partial<President> = {}): President {
  return {
    id: 'gasparovic',
    name: 'Ivan Gašparovič',
    from: '2004-06-15',
    to: '2014-06-15',
    citationUrl: 'https://www.prezident.sk/ivan-gasparovic/',
    ...overrides,
  }
}

export function contextYear(
  overrides: Partial<ContextYear> & Pick<ContextYear, 'year'>,
): ContextYear {
  const { year } = overrides
  return {
    academicYear: `${year}/${year + 1}`,
    students: 150_000,
    graduates: 30_000,
    internalTeachers: 10_000,
    internalProfessors: 1_200,
    appointments: 90,
    population: 5_400_000,
    appointmentsPerMillionResidents: 16.67,
    professorsPer100kResidents: 22.22,
    appointmentsPer1kGraduates: 3,
    graduatesPerAppointment: 333.33,
    appointmentsPer10kStudents: 6,
    appointmentsPer1kTeachers: 9,
    appointmentsPer100Professors: 7.5,
    professorShare: 12,
    ...overrides,
  }
}
