import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { Express } from 'express';
import path from 'node:path';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { PlanillaSheets } from './planilla_sheets.entity';
import { PlanillaSheetsRepository } from './planillas.repository';
import { QueryPlanillaDto } from './dto/query-planilla.dto';
import { UpdatePlanillaDto } from './dto/update-planilla.dto';
import { FinalizePlanillaDto } from './dto/finalize-planilla.dto';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { StudentsRepository } from '../students/students.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { AccessService } from '../auth/access.service';
import { CoursesRepository } from '../courses/courses.repository';

const PLANILLA_TEMPLATE_KEY = 'iedrc-secondary-v1';
const PLANILLA_GROUP_RE = /^\d{3,4}$/;
const PLANILLA_NOTE_RE = /\(([^)]*)\)/g;
const PLANILLA_HEADER_KEYWORDS = new Set(['ACTITUDINAL', 'PROCEDIMENTAL', 'COGNITIVO']);
const PLANILLA_LETTER_MARK_DOMAIN = new Set(['S', 'A', 'B', 'J']);
const PLANILLA_LETTER_MARK_KEY_RE = /^(act|proc|cog)_\d+$/;
const PLANILLA_FOOTER_PREFIXES = [
  'CONVENCIONES',
  'ACTITUDINAL',
  'PROCEDIMENTAL',
  'COGNITIVO',
  'FIRMA DEL PROFESOR',
];

type ActingUser = {
  nationalId: string;
  role: string;
};

type ParsedPlanillaRow = {
  rowId: string;
  order: number;
  studentName: string;
  note?: string | null;
  retired?: boolean;
  cells?: Record<string, string>;
};

type ParsedPlanillaMetadata = {
  subjectName: string;
  teacherName: string;
  periodLabel: string;
};

type ParsedPlanillaGroup = {
  sourceSheet: string;
  groupCode: string;
  gradeLevel: number;
  section: string;
  columns: PlanillaColumn[];
  metadata: ParsedPlanillaMetadata;
  rows: ParsedPlanillaRow[];
};

type PlanillaColumn = {
  key: string;
  group: string;
  label: string;
  type: string;
};

type PlanillaRow = {
  rowId: string;
  order: number;
  studentName: string;
  normalizedName: string;
  note: string | null;
  retired: boolean;
  nationalId: string | null;
  studentId: number | null;
  status: 'pending_id' | 'resolved' | 'retired';
  cells: Record<string, string>;
};

export type PlanillaResponse = {
  planillaSheetId: number;
  schoolYearId: number;
  classGroupId: number | null;
  gradeLevel: number;
  section: string;
  groupCode: string;
  sourceSheet: string;
  sourceFileName: string | null;
  templateKey: string;
  title: string;
  metadata: Record<string, unknown>;
  columns: PlanillaColumn[];
  rows: PlanillaRow[];
  summary: PlanillaSummary;
  isActive: boolean;
  importedById: string | null;
  importedAt: Date | null;
  updatedAt: Date | null;
  importClosedAt: Date | null;
};

export type PlanillaSummary = {
  total: number;
  resolved: number;
  pending: number;
  retired: number;
};

export type PlanillaListResponse = {
  planillaSheetId: number;
  schoolYearId: number;
  classGroupId: number | null;
  gradeLevel: number;
  section: string;
  groupCode: string;
  sourceSheet: string;
  sourceFileName: string | null;
  templateKey: string;
  title: string;
  metadata: Record<string, unknown>;
  summary: PlanillaSummary;
  isActive: boolean;
  importedById: string | null;
  importedAt: Date | null;
  updatedAt: Date | null;
  importClosedAt: Date | null;
};

type PlanillaListRow = {
  planillaSheetId: string;
  schoolYearId: string;
  classGroupId: string | null;
  gradeLevel: number;
  section: string;
  groupCode: string;
  sourceSheet: string;
  sourceFileName: string | null;
  templateKey: string;
  title: string;
  metadata: Record<string, unknown> | null;
  summaryTotal: string | number;
  summaryResolved: string | number;
  summaryPending: string | number;
  summaryRetired: string | number;
  isActive: boolean;
  importedById: string | null;
  importedAt: Date | null;
  updatedAt: Date | null;
  importClosedAt: Date | null;
};

const buildPlanillaColumns = (): PlanillaColumn[] => {
  const columns: PlanillaColumn[] = [];
  for (const [prefix, group] of [
    ['act', 'Actitudinal'],
    ['proc', 'Procedimental'],
    ['cog', 'Cognitivo'],
  ] as const) {
    for (let index = 1; index <= 4; index += 1) {
      columns.push({
        key: `${prefix}_${index}`,
        group,
        label: `${index}.0`,
        type: 'text',
      });
    }
  }
  columns.push({ key: 'final', group: 'Final', label: 'Final', type: 'text' });
  columns.push({
    key: 'inasistencia',
    group: 'Inasistencia',
    label: 'Inasistencia',
    type: 'text',
  });
  return columns;
};

const PLANILLA_COLUMNS = buildPlanillaColumns();

const PLANILLA_SOURCE_INDEX_BY_KEY = new Map<string, number>([
  ['act_1', 2],
  ['act_2', 3],
  ['act_3', 4],
  ['act_4', 5],
  ['proc_1', 6],
  ['proc_2', 7],
  ['proc_3', 8],
  ['proc_4', 9],
  ['cog_1', 10],
  ['cog_2', 11],
  ['cog_3', 12],
  ['cog_4', 13],
  ['final', 14],
  ['inasistencia', 15],
]);

const sanitizePlanillaCellValue = (key: string, value: unknown) => {
  const normalized = String(value ?? '').trim();

  if (!PLANILLA_LETTER_MARK_KEY_RE.test(key)) {
    return normalized;
  }

  const upper = normalized.toUpperCase();
  return PLANILLA_LETTER_MARK_DOMAIN.has(upper) ? upper : '';
};

@Injectable()
export class PlanillasService {
  constructor(
    private readonly repository: PlanillaSheetsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  async findAll(
    query: QueryPlanillaDto,
    currentUser: ActingUser,
  ): Promise<PaginatedResult<PlanillaListResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('planilla')
      .orderBy('planilla.gradeLevel', 'ASC')
      .addOrderBy('planilla.groupCode', 'ASC');

    if (query.schoolYearId !== undefined) {
      qb.andWhere('planilla.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (query.gradeLevel !== undefined) {
      qb.andWhere('planilla.gradeLevel = :gradeLevel', {
        gradeLevel: query.gradeLevel,
      });
    }

    if (query.groupCode !== undefined) {
      qb.andWhere('planilla.groupCode = :groupCode', {
        groupCode: query.groupCode,
      });
    }

    if (currentUser.role === 'teacher') {
      const allowedClassGroupIds = await this.createAccessHelper().classGroupIdsForTeacher(
        currentUser.nationalId,
      );

      if (allowedClassGroupIds.length === 0) {
        return buildPaginationResult([], 0, page, pageSize);
      }

      qb.andWhere('planilla.classGroupId IN (:...allowedClassGroupIds)', {
        allowedClassGroupIds: allowedClassGroupIds.map((value) => value.toString()),
      });
    } else {
      qb.andWhere('planilla.importClosedAt IS NULL');
    }

    const total = await qb.getCount();

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    qb.select('planilla.planillaSheetId', 'planillaSheetId')
      .addSelect('planilla.schoolYearId', 'schoolYearId')
      .addSelect('planilla.classGroupId', 'classGroupId')
      .addSelect('planilla.gradeLevel', 'gradeLevel')
      .addSelect('planilla.section', 'section')
      .addSelect('planilla.groupCode', 'groupCode')
      .addSelect('planilla.sourceSheet', 'sourceSheet')
      .addSelect('planilla.sourceFileName', 'sourceFileName')
      .addSelect('planilla.templateKey', 'templateKey')
      .addSelect('planilla.title', 'title')
      .addSelect('planilla.metadata', 'metadata')
      .addSelect('planilla.isActive', 'isActive')
      .addSelect('planilla.importedById', 'importedById')
      .addSelect('planilla.importedAt', 'importedAt')
      .addSelect('planilla.updatedAt', 'updatedAt')
      .addSelect('planilla.importClosedAt', 'importClosedAt')
      .addSelect(
        `jsonb_array_length(COALESCE(planilla.rows, '[]'::jsonb))`,
        'summaryTotal',
      )
      .addSelect(
        `(
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(COALESCE(planilla.rows, '[]'::jsonb)) AS row(elem)
          WHERE COALESCE(row.elem->>'retired', 'false') <> 'true'
            AND row.elem->>'status' = 'resolved'
        )`,
        'summaryResolved',
      )
      .addSelect(
        `(
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(COALESCE(planilla.rows, '[]'::jsonb)) AS row(elem)
          WHERE COALESCE(row.elem->>'retired', 'false') = 'true'
        )`,
        'summaryRetired',
      )
      .addSelect(
        `(
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(COALESCE(planilla.rows, '[]'::jsonb)) AS row(elem)
          WHERE COALESCE(row.elem->>'retired', 'false') <> 'true'
            AND COALESCE(row.elem->>'status', '') <> 'resolved'
        )`,
        'summaryPending',
      );

    const rows = await qb.getRawMany<PlanillaListRow>();

    return buildPaginationResult(
      rows.map((row) => this.toListResponse(row)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number, currentUser: ActingUser): Promise<PlanillaResponse> {
    const entity = await this.repository.findOne({
      where: { planillaSheetId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Planilla not found');
    }

    await this.assertCanAccess(entity, currentUser);

    return this.toResponse(entity);
  }

  async importPlanillas(
    file: Express.Multer.File,
    schoolYearId: number,
    replaceExisting: boolean,
    currentUser: ActingUser,
  ): Promise<{
    imported: number;
    replaced: number;
    skipped: number;
    unmatchedGroups: string[];
    sheets: PlanillaResponse[];
  }> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    await this.resolveSchoolYear(schoolYearId);

    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.xlsx') {
      throw new BadRequestException('El archivo debe estar en formato Excel (.xlsx).');
    }

    const parsedGroups = await this.parseExcelFile(file);
    if (parsedGroups.length === 0) {
      throw new BadRequestException('No planilla groups were detected in the file.');
    }

    const existingSheets = await this.repository.find({
      where: {
        schoolYearId: schoolYearId.toString(),
        templateKey: PLANILLA_TEMPLATE_KEY,
      },
    });
    const existingByGroupCode = new Map(existingSheets.map((sheet) => [sheet.groupCode, sheet]));

    const classGroups = await this.classGroupsRepository.find({
      where: { schoolYearId: schoolYearId.toString() },
    });
    const classGroupsByCode = new Map(
      classGroups.map((group) => [this.buildGroupCode(group.gradeLevel, group.section), group]),
    );

    const unmatchedGroups = new Set<string>();
    const savedSheets: PlanillaResponse[] = [];
    let imported = 0;
    let replaced = 0;
    let skipped = 0;

    for (const parsed of parsedGroups) {
      const existing = existingByGroupCode.get(parsed.groupCode) ?? null;
      if (existing && !replaceExisting) {
        skipped += 1;
        savedSheets.push(this.toResponse(existing));
        continue;
      }

      let matchedClassGroup = classGroupsByCode.get(parsed.groupCode) ?? null;
      if (!matchedClassGroup) {
        matchedClassGroup = await this.ensureClassGroup(
          schoolYearId.toString(),
          parsed.gradeLevel,
          parsed.section,
        );
        classGroupsByCode.set(parsed.groupCode, matchedClassGroup);
      }

      const entity = existing ?? this.repository.create();
      const metadata = this.buildMetadata(entity.metadata, parsed, matchedClassGroup?.classGroupId ?? null);

      entity.schoolYearId = schoolYearId.toString();
      entity.classGroupId = matchedClassGroup?.classGroupId ?? null;
      entity.gradeLevel = parsed.gradeLevel;
      entity.section = parsed.section;
      entity.groupCode = parsed.groupCode;
      entity.sourceSheet = parsed.sourceSheet;
      entity.sourceFileName = file.originalname;
      entity.templateKey = PLANILLA_TEMPLATE_KEY;
      entity.title = `Planilla ${parsed.groupCode}`;
      entity.metadata = metadata;
      entity.columns = parsed.columns;
      entity.rows = this.buildRows(parsed, existing?.rows, parsed.columns);
      entity.isActive = true;
      entity.importedById = currentUser.nationalId || null;
      entity.importClosedAt = null;

      const saved = await this.repository.save(entity);
      savedSheets.push(this.toResponse(saved));

      if (existing) {
        replaced += 1;
      } else {
        imported += 1;
      }
    }

    return {
      imported,
      replaced,
      skipped,
      unmatchedGroups: Array.from(unmatchedGroups).sort(),
      sheets: savedSheets,
    };
  }

  async update(
    id: number,
    dto: UpdatePlanillaDto,
    currentUser: ActingUser,
  ): Promise<PlanillaResponse> {
    const entity = await this.getEntity(id);
    await this.assertCanAccess(entity, currentUser, true);

    if (dto.title !== undefined) {
      entity.title = dto.title;
    }

    if (dto.metadata !== undefined) {
      entity.metadata = {
        ...(entity.metadata ?? {}),
        ...dto.metadata,
      };
    }

    if (dto.rows !== undefined) {
      entity.rows = this.sanitizeRows(dto.rows, entity.columns as PlanillaColumn[]);
    }

    const saved = await this.repository.save(entity);
    return this.toResponse(saved);
  }

  async finalize(
    id: number,
    dto: FinalizePlanillaDto,
    currentUser: ActingUser,
  ): Promise<{
    planillaSheetId: number;
    resolved: number;
    retired: number;
    unresolved: string[];
  }> {
    const entity = await this.getEntity(id);
    await this.assertCanAccess(entity, currentUser, true);

    const rows = this.sanitizeRows(entity.rows, entity.columns as PlanillaColumn[]);
    const unresolved: string[] = [];
    let resolved = 0;
    let retired = 0;

    if (!entity.schoolYearId) {
      throw new ConflictException('Planilla is missing school year information.');
    }

    const classGroup = await this.ensureClassGroup(
      entity.schoolYearId,
      entity.gradeLevel,
      entity.section,
    );
    entity.classGroupId = classGroup.classGroupId;
    entity.metadata = {
      ...(entity.metadata ?? {}),
      classGroupId: Number(classGroup.classGroupId),
    };

    for (const row of rows) {
      if (!row.nationalId?.trim()) {
        unresolved.push(row.studentName);
        continue;
      }

      const student = await this.findOrCreateStudent(row);

      row.studentId = Number(student.studentId);
      if (row.retired) {
        student.isActive = false;
        await this.studentsRepository.save(student);
        await this.deactivateActiveEnrollments(student.studentId, entity.schoolYearId);
        row.status = 'retired';
        retired += 1;
        continue;
      }

      student.isActive = true;
      await this.studentsRepository.save(student);
      await this.upsertEnrollment(
        student.studentId,
        entity.schoolYearId,
        entity.classGroupId,
        entity.gradeLevel,
      );
      row.status = 'resolved';
      resolved += 1;
    }

    if (!dto.allowPartial && unresolved.length > 0) {
      throw new ConflictException(
        `Hay estudiantes sin documento: ${unresolved.join(', ')}`,
      );
    }

    entity.rows = rows;
    const summary = this.buildSummary(rows);
    entity.importClosedAt = summary.pending === 0 ? new Date() : null;
    if (summary.pending === 0) {
      entity.sourceFileName = null;
    }
    await this.repository.save(entity);

    return {
      planillaSheetId: Number(entity.planillaSheetId),
      resolved,
      retired,
      unresolved,
    };
  }

  private async parseExcelFile(file: Express.Multer.File): Promise<ParsedPlanillaGroup[]> {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const parsedGroups: ParsedPlanillaGroup[] = [];

      workbook.worksheets.forEach((worksheet) => {
        const sheetName = worksheet.name;
        const rows = worksheet.getSheetValues().slice(1).map((rawRow) => {
          if (!Array.isArray(rawRow)) {
            return [];
          }
          return rawRow.slice(1) as Array<string | number | null>;
        });

        const metadata = this.extractMetadataFromRows(rows);
        let currentGroup: ParsedPlanillaGroup | null = null;
        let sequence = 0;

        rows.forEach((rawRow) => {
          const values = rawRow.map((cell) => this.normalizeSpreadsheetCell(cell));
          const first = values[0] ?? '';
          const second = values[1] ?? '';
          const maybeGroup = this.parseGroupCode(first);

          if (maybeGroup && this.isGroupHeaderRow(values)) {
            currentGroup = {
              ...maybeGroup,
              sourceSheet: sheetName,
              columns: PLANILLA_COLUMNS,
              metadata,
              rows: [],
            };
            parsedGroups.push(currentGroup);
            sequence = 0;
            return;
          }

          if (!currentGroup) {
            return;
          }

          if (second.toUpperCase() === 'NOMBRE DEL ESTUDIANTE') {
            return;
          }

          if (this.isFooterRow(first, second) || !second) {
            return;
          }

          if (PLANILLA_HEADER_KEYWORDS.has(second.toUpperCase())) {
            return;
          }

          const { cleanedName, note, retired } = this.parseName(second);
          if (!cleanedName) {
            return;
          }

          sequence += 1;
          currentGroup.rows.push({
            rowId: `${currentGroup.groupCode}-${sequence}`,
            order: /^\d+$/.test(first) ? Number(first) : sequence,
            studentName: cleanedName,
            note,
            retired,
            cells: this.extractCells(values),
          });
        });
      });

      return parsedGroups;
    } catch {
      throw new BadRequestException(
        'No se pudo procesar el archivo Excel. Verifica que el archivo .xlsx sea válido.',
      );
    }
  }

  private buildRows(
    parsed: ParsedPlanillaGroup,
    existingRows: Array<Record<string, unknown>> | undefined,
    columns: PlanillaColumn[],
  ): PlanillaRow[] {
    const existingByName = new Map<string, PlanillaRow>();
    this.sanitizeRows(existingRows ?? [], columns).forEach((row) => {
      existingByName.set(row.normalizedName, row);
    });

    return parsed.rows.map((row) => {
      const normalizedName = this.normalizeName(row.studentName);
      const existing = existingByName.get(normalizedName) ?? null;
      const retired = Boolean(row.retired);
      const nationalId = this.cleanNationalId(existing?.nationalId ?? null);
      const studentId = existing?.studentId ?? null;
      return {
        rowId: row.rowId,
        order: row.order,
        studentName: row.studentName,
        normalizedName,
        note: row.note ?? null,
        retired,
        nationalId,
        studentId,
        status: retired ? 'retired' : nationalId ? 'resolved' : 'pending_id',
        cells: this.mergeImportedCells(row.cells ?? this.createEmptyCells(columns), existing?.cells, columns),
      };
    });
  }

  private sanitizeRows(
    rawRows: Array<Record<string, unknown>>,
    columns: PlanillaColumn[],
  ): PlanillaRow[] {
    return rawRows.map((raw, index) => {
      const studentName = String(raw.studentName ?? '').trim();
      const normalizedName = this.normalizeName(studentName);
      const cells = this.createEmptyCells(columns);
      const rawCells = (raw.cells as Record<string, unknown> | undefined) ?? {};
      Object.keys(cells).forEach((key) => {
        cells[key] = sanitizePlanillaCellValue(key, rawCells[key] ?? '');
      });
      const nationalId = this.cleanNationalId(raw.nationalId ?? null);
      const retired = Boolean(raw.retired);
      return {
        rowId: String(raw.rowId ?? `row-${index + 1}`),
        order: Number(raw.order ?? index + 1),
        studentName,
        normalizedName,
        note: raw.note ? String(raw.note) : null,
        retired,
        nationalId,
        studentId:
          raw.studentId !== undefined && raw.studentId !== null && raw.studentId !== ''
            ? Number(raw.studentId)
            : null,
        status: retired ? 'retired' : nationalId ? 'resolved' : 'pending_id',
        cells,
      };
    });
  }

  private createEmptyCells(columns: PlanillaColumn[]): Record<string, string> {
    return Object.fromEntries(columns.map((column) => [column.key, '']));
  }

  private mergeImportedCells(
    importedCells: Record<string, string>,
    existingCells: Record<string, string> | undefined,
    columns: PlanillaColumn[],
  ): Record<string, string> {
    const merged = this.createEmptyCells(columns);
    columns.forEach((column) => {
      const existingValue = sanitizePlanillaCellValue(
        column.key,
        existingCells?.[column.key] ?? '',
      );
      const importedValue = sanitizePlanillaCellValue(
        column.key,
        importedCells[column.key] ?? '',
      );
      merged[column.key] = existingValue || importedValue;
    });
    return merged;
  }

  private buildMetadata(
    existing: Record<string, unknown> | undefined,
    parsed: ParsedPlanillaGroup,
    classGroupId: string | null,
  ): Record<string, unknown> {
    return {
      institution: 'IED Rufino Cuervo',
      templateLabel: 'Registro de valoraciones evaluativas',
      subjectName: (existing?.subjectName as string | undefined) ?? parsed.metadata.subjectName,
      teacherName: (existing?.teacherName as string | undefined) ?? parsed.metadata.teacherName,
      periodLabel: (existing?.periodLabel as string | undefined) ?? parsed.metadata.periodLabel,
      sourceSheet: parsed.sourceSheet,
      classGroupId: classGroupId ? Number(classGroupId) : null,
    };
  }

  private async ensureClassGroup(
    schoolYearId: string,
    gradeLevel: number,
    section: string,
  ) {
    const existing = await this.classGroupsRepository.findOne({
      where: {
        schoolYearId,
        gradeLevel,
        section,
      },
    });

    if (existing) {
      return existing;
    }

    const created = this.classGroupsRepository.create({
      schoolYearId,
      gradeLevel,
      section,
    });

    try {
      return await this.classGroupsRepository.save(created);
    } catch (error) {
      const concurrent = await this.classGroupsRepository.findOne({
        where: {
          schoolYearId,
          gradeLevel,
          section,
        },
      });

      if (concurrent) {
        return concurrent;
      }

      throw error;
    }
  }

  private async findOrCreateStudent(row: PlanillaRow) {
    const nationalId = row.nationalId?.trim();
    if (!nationalId) {
      throw new BadRequestException(`Missing national ID for ${row.studentName}`);
    }

    const existing = await this.studentsRepository.findOne({
      where: { nationalId },
    });

    const { firstName, lastName } = this.splitStudentName(row.studentName);

    if (existing) {
      existing.firstName = firstName;
      existing.lastName = lastName;
      return this.studentsRepository.save(existing);
    }

    const created = this.studentsRepository.create({
      nationalId,
      firstName,
      lastName,
      guardianName: 'Pendiente',
      guardianRelationship: 'Otro',
      guardianPhone: 'Pendiente',
      gender: 'No Binario',
      isActive: !row.retired,
    });

    return this.studentsRepository.save(created);
  }

  private async upsertEnrollment(
    studentId: string,
    schoolYearId: string,
    classGroupId: string,
    gradeLevel: number,
  ) {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId,
        schoolYearId,
        active: true,
      },
    });

    if (enrollment) {
      enrollment.classGroupId = classGroupId;
      enrollment.gradeLevel = gradeLevel;
      enrollment.active = true;
      await this.enrollmentsRepository.save(enrollment);
      return;
    }

    const created = this.enrollmentsRepository.create({
      studentId,
      schoolYearId,
      classGroupId,
      gradeLevel,
      active: true,
    });

    await this.enrollmentsRepository.save(created);
  }

  private async deactivateActiveEnrollments(studentId: string, schoolYearId: string) {
    const enrollments = await this.enrollmentsRepository.find({
      where: { studentId, schoolYearId, active: true },
    });

    if (enrollments.length === 0) {
      return;
    }

    enrollments.forEach((enrollment) => {
      enrollment.active = false;
      enrollment.classGroupId = null;
    });

    await this.enrollmentsRepository.save(enrollments);
  }

  private buildGroupCode(gradeLevel: number, section: string) {
    return `${gradeLevel}${section.padStart(2, '0')}`;
  }

  private splitStudentName(fullName: string): { firstName: string; lastName: string } {
    const cleaned = fullName
      .replace(/\s+/g, ' ')
      .trim();
    const parts = cleaned.split(' ').filter(Boolean);

    if (parts.length <= 1) {
      return {
        firstName: cleaned || 'Pendiente',
        lastName: 'Pendiente',
      };
    }

    if (parts.length === 2) {
      return {
        lastName: parts[0],
        firstName: parts[1],
      };
    }

    if (parts.length === 3) {
      return {
        lastName: `${parts[0]} ${parts[1]}`,
        firstName: parts[2],
      };
    }

    return {
      lastName: `${parts[0]} ${parts[1]}`,
      firstName: parts.slice(2).join(' '),
    };
  }

  private cleanNationalId(value: unknown): string | null {
    const raw = value == null ? '' : String(value).trim();
    return raw ? raw : null;
  }

  private normalizeSpreadsheetCell(value: unknown): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : value.toString();
    }

    return String(value).replace(/\s+/g, ' ').trim();
  }

  private parseGroupCode(raw: string) {
    if (!PLANILLA_GROUP_RE.test(raw)) {
      return null;
    }

    return {
      groupCode: raw,
      gradeLevel: Number(raw.slice(0, -2)),
      section: raw.slice(-2),
    };
  }

  private isGroupHeaderRow(values: string[]) {
    const markers = new Set(values.map((value) => value.toUpperCase()).filter(Boolean));
    return Array.from(PLANILLA_HEADER_KEYWORDS).some((keyword) => markers.has(keyword));
  }

  private isFooterRow(first: string, second: string) {
    const firstUpper = first.toUpperCase();
    const secondUpper = second.toUpperCase();
    return PLANILLA_FOOTER_PREFIXES.some(
      (prefix) => firstUpper.startsWith(prefix) || secondUpper.startsWith(prefix),
    );
  }

  private parseName(rawName: string) {
    const noteMatches = Array.from(rawName.matchAll(PLANILLA_NOTE_RE))
      .map((match) => match[1]?.trim())
      .filter((value): value is string => Boolean(value));
    const note = noteMatches.length > 0 ? noteMatches.join(' | ') : null;
    const cleanedName = rawName
      .replace(PLANILLA_NOTE_RE, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+,/g, ',');

    return {
      cleanedName,
      note,
      retired: noteMatches.some((value) => value.toLowerCase().includes('ret')),
    };
  }

  private extractCells(values: string[]): Record<string, string> {
    return Object.fromEntries(
      PLANILLA_COLUMNS.map((column) => [
        column.key,
        values[PLANILLA_SOURCE_INDEX_BY_KEY.get(column.key) ?? -1] ?? '',
      ]),
    );
  }

  private extractMetadataFromRows(rows: Array<Array<string | number | null>>): ParsedPlanillaMetadata {
    return {
      subjectName: this.findMetadataValue(rows, 'ASIGNATURA'),
      teacherName: this.findMetadataValue(rows, 'PROFESOR(A)'),
      periodLabel: this.findMetadataValue(rows, 'PERÍODO'),
    };
  }

  private findMetadataValue(rows: Array<Array<string | number | null>>, label: string) {
    const normalizedLabel = label.toUpperCase();
    for (const row of rows.slice(0, 8)) {
      const values = row.map((cell) => this.normalizeSpreadsheetCell(cell));
      const first = (values[0] ?? '').toUpperCase().replace(/[:\s]+$/g, '');
      if (first.startsWith(normalizedLabel)) {
        const extraFromFirst = (values[0] ?? '').split(':').slice(1).join(':').trim();
        if (extraFromFirst) {
          return extraFromFirst;
        }
        const next = values.slice(1).find((value) => value.trim().length > 0);
        return next ?? '';
      }
    }
    return '';
  }

  private normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async resolveSchoolYear(id: number) {
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  private async getEntity(id: number): Promise<PlanillaSheets> {
    const entity = await this.repository.findOne({
      where: { planillaSheetId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Planilla not found');
    }

    return entity;
  }

  private async assertCanAccess(
    entity: PlanillaSheets,
    currentUser: ActingUser,
    mutate = false,
  ) {
    if (currentUser.role === 'admin' || currentUser.role === 'coordinator') {
      return;
    }

    if (currentUser.role !== 'teacher') {
      throw new ForbiddenException('You are not allowed to access this planilla');
    }

    if (mutate && !entity.classGroupId) {
      throw new ForbiddenException('You are not allowed to modify this planilla');
    }

    const allowedClassGroupIds = await this.createAccessHelper().classGroupIdsForTeacher(
      currentUser.nationalId,
    );

    if (!entity.classGroupId || !allowedClassGroupIds.includes(Number(entity.classGroupId))) {
      throw new ForbiddenException('You are not allowed to access this planilla');
    }
  }

  private toResponse(entity: PlanillaSheets): PlanillaResponse {
    const columns = (entity.columns ?? []) as PlanillaColumn[];
    const rows = this.sanitizeRows(entity.rows ?? [], columns);
    const summary = this.buildSummary(rows);
    return {
      planillaSheetId: Number(entity.planillaSheetId),
      schoolYearId: Number(entity.schoolYearId),
      classGroupId: entity.classGroupId ? Number(entity.classGroupId) : null,
      gradeLevel: entity.gradeLevel,
      section: entity.section,
      groupCode: entity.groupCode,
      sourceSheet: entity.sourceSheet,
      sourceFileName: entity.sourceFileName ?? null,
      templateKey: entity.templateKey,
      title: entity.title,
      metadata: (entity.metadata ?? {}) as Record<string, unknown>,
      columns,
      rows,
      summary,
      isActive: entity.isActive,
      importedById: entity.importedById ?? null,
      importedAt: entity.importedAt ?? null,
      updatedAt: entity.updatedAt ?? null,
      importClosedAt: entity.importClosedAt ?? null,
    };
  }

  private toListResponse(row: PlanillaListRow): PlanillaListResponse {
    return {
      planillaSheetId: Number(row.planillaSheetId),
      schoolYearId: Number(row.schoolYearId),
      classGroupId: row.classGroupId ? Number(row.classGroupId) : null,
      gradeLevel: Number(row.gradeLevel),
      section: row.section,
      groupCode: row.groupCode,
      sourceSheet: row.sourceSheet,
      sourceFileName: row.sourceFileName ?? null,
      templateKey: row.templateKey,
      title: row.title,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      summary: {
        total: Number(row.summaryTotal ?? 0),
        resolved: Number(row.summaryResolved ?? 0),
        pending: Number(row.summaryPending ?? 0),
        retired: Number(row.summaryRetired ?? 0),
      },
      isActive: Boolean(row.isActive),
      importedById: row.importedById ?? null,
      importedAt: row.importedAt ?? null,
      updatedAt: row.updatedAt ?? null,
      importClosedAt: row.importClosedAt ?? null,
    };
  }

  private buildSummary(rows: PlanillaRow[]): PlanillaSummary {
    return rows.reduce<PlanillaSummary>(
      (accumulator, row) => {
        accumulator.total += 1;
        if (row.retired) {
          accumulator.retired += 1;
        } else if (row.status === 'resolved') {
          accumulator.resolved += 1;
        } else {
          accumulator.pending += 1;
        }
        return accumulator;
      },
      { total: 0, resolved: 0, pending: 0, retired: 0 },
    );
  }

  private createAccessHelper(): AccessService {
    return new AccessService(this.coursesRepository);
  }
}
