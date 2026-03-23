import { AppRole } from '../auth/roles.decorator';

export const CALENDAR_EVENT_CATEGORIES = [
  'communication',
  'official',
  'retake_period',
  'enrollment_period',
  'teacher_exam',
  'teacher_homework',
  'teacher_custom',
] as const;

export type CalendarEventCategory = (typeof CALENDAR_EVENT_CATEGORIES)[number];

export const CALENDAR_EVENT_VISIBILITY_SCOPES = [
  'everyone',
  'registrars',
  'all_teachers',
  'selected_teachers',
  'teacher_areas',
  'class_groups',
] as const;

export type CalendarEventVisibilityScope =
  (typeof CALENDAR_EVENT_VISIBILITY_SCOPES)[number];

export const CALENDAR_EVENT_KIND_OPTIONS: Record<
  CalendarEventCategory,
  readonly string[]
> = {
  communication: ['announcement', 'meeting', 'custom'],
  official: ['school_break', 'special_day', 'graduation', 'custom'],
  retake_period: ['retake_period'],
  enrollment_period: ['enrollment_period'],
  teacher_exam: ['exam'],
  teacher_homework: ['homework'],
  teacher_custom: ['custom'],
};

export const ADMIN_CALENDAR_CATEGORIES: readonly CalendarEventCategory[] = [
  'communication',
  'official',
  'retake_period',
  'enrollment_period',
];

export const TEACHER_CALENDAR_CATEGORIES: readonly CalendarEventCategory[] = [
  'teacher_exam',
  'teacher_homework',
  'teacher_custom',
];

export const OFFICIAL_CALENDAR_CATEGORIES: readonly CalendarEventCategory[] = [
  'official',
  'retake_period',
  'enrollment_period',
];

export const ADMIN_COMMUNICATION_VISIBILITY_SCOPES: readonly CalendarEventVisibilityScope[] =
  [
    'everyone',
    'registrars',
    'all_teachers',
    'selected_teachers',
    'teacher_areas',
  ];

export const OFFICIAL_CALENDAR_VISIBILITY_SCOPE: CalendarEventVisibilityScope =
  'everyone';

export const TEACHER_CALENDAR_VISIBILITY_SCOPE: CalendarEventVisibilityScope =
  'class_groups';

export const CALENDAR_EVENT_MUTATE_ROLES: readonly AppRole[] = [
  'admin',
  'coordinator',
  'teacher',
];
