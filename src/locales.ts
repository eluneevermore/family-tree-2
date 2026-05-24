import { Language, ParseDiagnostic } from './types';

export interface LocaleStrings {
  readonly appTitle: string;
  readonly searchPeople: string;
  readonly viewMode: string;
  readonly import: string;
  readonly export: string;
  readonly toggleSplitView: string;
  readonly compactDsl: string;
  readonly valid: string;
  readonly needsFixes: string;
  readonly noDiagnostics: string;
  readonly parserDiagnostics: string;
  readonly addSpouse: string;
  readonly addChild: string;
  readonly addParent: string;
  readonly addSpouseFor: (name: string) => string;
  readonly addChildFor: (name: string) => string;
  readonly addParentFor: (name: string) => string;
  readonly nodeActionsFor: (name: string) => string;
  readonly closeDialog: string;
  readonly relationship: string;
  readonly singleParent: (name: string) => string;
  readonly newPerson: string;
  readonly existing: string;
  readonly name: string;
  readonly gender: string;
  readonly born: string;
  readonly personId: string;
  readonly typeIdOrName: string;
  readonly updateText: string;
  readonly cancel: string;
  readonly unknown: string;
  readonly male: string;
  readonly female: string;
  readonly other: string;
  readonly selected: string;
  readonly calls: string;
  readonly relationshipHint: string;
  readonly focus: string;
  readonly rearrangeGraph: string;
  readonly confirmRearrangeGraph: string;
  readonly showDescendants: string;
  readonly hideDescendants: string;
  readonly showDescendantsWith: (name: string) => string;
  readonly spousesOf: (name: string) => string;
  readonly formatDiagnostic: (diagnostic: ParseDiagnostic) => string;
}

export const locales: Record<Language, LocaleStrings> = {
  en: {
    appTitle: 'Family Tree v2',
    searchPeople: 'Search people',
    viewMode: 'View mode',
    import: 'Import',
    export: 'Export',
    toggleSplitView: 'Toggle split view',
    compactDsl: 'Compact DSL',
    valid: 'Valid',
    needsFixes: 'Needs fixes',
    noDiagnostics: 'No parser diagnostics.',
    parserDiagnostics: 'Parser diagnostics',
    addSpouse: 'Add spouse',
    addChild: 'Add child',
    addParent: 'Add parent',
    addSpouseFor: (name) => `Add spouse for ${name}`,
    addChildFor: (name) => `Add child for ${name}`,
    addParentFor: (name) => `Add parent for ${name}`,
    nodeActionsFor: (name) => `Actions for ${name}`,
    closeDialog: 'Close dialog',
    relationship: 'Relationship',
    singleParent: (name) => `Single parent: ${name}`,
    newPerson: 'New person',
    existing: 'Existing',
    name: 'Name',
    gender: 'Gender',
    born: 'Born',
    personId: 'Person id',
    typeIdOrName: 'Type id or name',
    updateText: 'Update text',
    cancel: 'Cancel',
    unknown: 'Unknown',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    selected: 'Selected',
    calls: 'calls',
    relationshipHint: 'Select a person, then hover another person to see kinship.',
    focus: 'Focus',
    rearrangeGraph: 'Rearrange graph',
    confirmRearrangeGraph: 'Clear manual node positions and use the default arrangement?',
    showDescendants: 'Show descendants',
    hideDescendants: 'Hide descendants',
    showDescendantsWith: (name) => `Show descendants with ${name}`,
    spousesOf: (name) => `Spouses of ${name}`,
    formatDiagnostic: (diagnostic) => diagnostic.message
  },
  vi: {
    appTitle: 'Gia phả v2',
    searchPeople: 'Tìm người',
    viewMode: 'Chế độ xem',
    import: 'Nhập',
    export: 'Xuất',
    toggleSplitView: 'Bật/tắt chia đôi',
    compactDsl: 'DSL rút gọn',
    valid: 'Hợp lệ',
    needsFixes: 'Cần sửa',
    noDiagnostics: 'Không có cảnh báo cú pháp.',
    parserDiagnostics: 'Cảnh báo cú pháp',
    addSpouse: 'Thêm vợ/chồng',
    addChild: 'Thêm con',
    addParent: 'Thêm bố/mẹ',
    addSpouseFor: (name) => `Thêm vợ/chồng cho ${name}`,
    addChildFor: (name) => `Thêm con cho ${name}`,
    addParentFor: (name) => `Thêm bố/mẹ cho ${name}`,
    nodeActionsFor: (name) => `Thao tác cho ${name}`,
    closeDialog: 'Đóng hộp thoại',
    relationship: 'Quan hệ',
    singleParent: (name) => `Bố/mẹ đơn thân: ${name}`,
    newPerson: 'Người mới',
    existing: 'Đã có',
    name: 'Tên',
    gender: 'Giới tính',
    born: 'Năm sinh',
    personId: 'Mã người',
    typeIdOrName: 'Nhập mã hoặc tên',
    updateText: 'Cập nhật văn bản',
    cancel: 'Huỷ',
    unknown: 'Không rõ',
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    selected: 'Đã chọn',
    calls: 'gọi là',
    relationshipHint: 'Chọn một người, rồi di chuột lên người khác để xem cách xưng hô.',
    focus: 'Chuyển nhánh',
    rearrangeGraph: 'Sắp xếp lại',
    confirmRearrangeGraph: 'Xoá vị trí kéo tay và dùng bố cục mặc định?',
    showDescendants: 'Hiện hậu duệ',
    hideDescendants: 'Ẩn hậu duệ',
    showDescendantsWith: (name) => `Hiện hậu duệ với ${name}`,
    spousesOf: (name) => `Vợ/chồng của ${name}`,
    formatDiagnostic: formatVietnameseDiagnostic
  }
};

function formatVietnameseDiagnostic(diagnostic: ParseDiagnostic): string {
  const quotedValue = extractQuotedValue(diagnostic.message);
  if (diagnostic.code === 'invalid-line') {
    return `Dòng ${diagnostic.line} không phải là người hoặc quan hệ hợp lệ.`;
  }

  if (diagnostic.code === 'invalid-person-id') {
    return `Mã người không hợp lệ${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'duplicate-person') {
    return `Mã người bị trùng${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'missing-person-name') {
    return `Người này cần có tên${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'invalid-attribute') {
    return `Thuộc tính không hợp lệ đã bị bỏ qua${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'unknown-attribute') {
    return `Thuộc tính chưa hỗ trợ đã bị bỏ qua${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'invalid-relationship') {
    return `Quan hệ không hợp lệ${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'invalid-child-id') {
    return `Mã con không hợp lệ${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'duplicate-family') {
    return `Quan hệ bị trùng đã được gộp${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'unknown-reference') {
    return `Không tìm thấy mã người${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'multiple-parent-families') {
    return `Một người đang xuất hiện là con trong nhiều gia đình${quotedValue ? `: "${quotedValue}"` : ''}.`;
  }

  if (diagnostic.code === 'cycle') {
    return `Phát hiện vòng lặp quan hệ${quotedValue ? ` tại "${quotedValue}"` : ''}.`;
  }

  return diagnostic.message;
}

function extractQuotedValue(message: string): string | null {
  return message.match(/"([^"]+)"/)?.[1] ?? null;
}
