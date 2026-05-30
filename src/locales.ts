import { Language, ParseDiagnostic } from './types';

export interface LocaleStrings {
  readonly appTitle: string;
  readonly familyTree: string;
  readonly createFamilyTree: string;
  readonly renameFamilyTree: string;
  readonly deleteFamilyTree: string;
  readonly newFamilyTreeName: string;
  readonly renameFamilyTreeName: string;
  readonly confirmDeleteFamilyTree: (name: string) => string;
  readonly graphSettings: string;
  readonly connectionStyle: string;
  readonly connectionCurve: string;
  readonly connectionSmoothStep: string;
  readonly connectionStraight: string;
  readonly connectionStep: string;
  readonly nodeHeight: string;
  readonly nodeWidth: string;
  readonly nodeSpacing: string;
  readonly searchPeople: string;
  readonly searchSuggestions: string;
  readonly clearSearch: string;
  readonly resizeEditor: string;
  readonly viewMode: string;
  readonly import: string;
  readonly export: string;
  readonly shareTree: string;
  readonly shareLinkPrompt: string;
  readonly sharedPreviewTitle: string;
  readonly sharedPreviewDescription: string;
  readonly sharedTreeName: string;
  readonly saveSharedTreeAsNew: string;
  readonly replaceCurrentTree: string;
  readonly confirmReplaceCurrentTree: (name: string) => string;
  readonly discardSharedPreview: string;
  readonly toggleSplitView: string;
  readonly splitGraphView: string;
  readonly closeSplitGraphView: string;
  readonly compactDsl: string;
  readonly dslHelp: string;
  readonly dslLegendTitle: string;
  readonly dslLegendIntro: string;
  readonly dslLegendPersonLine: string;
  readonly dslLegendRelationshipLine: string;
  readonly dslLegendMarriageLine: string;
  readonly dslLegendSingleParentLine: string;
  readonly dslLegendAliases: string;
  readonly dslLegendSpacing: string;
  readonly dslLegendExample: string;
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
  readonly died: string;
  readonly note: string;
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
    familyTree: 'Family tree',
    createFamilyTree: 'Create new tree...',
    renameFamilyTree: 'Rename tree',
    deleteFamilyTree: 'Delete tree',
    newFamilyTreeName: 'New family tree name',
    renameFamilyTreeName: 'Rename family tree',
    confirmDeleteFamilyTree: (name) => `Delete "${name}"? This cannot be undone.`,
    graphSettings: 'Graph settings',
    connectionStyle: 'Connection style',
    connectionCurve: 'Curve',
    connectionSmoothStep: 'Smooth step',
    connectionStraight: 'Straight',
    connectionStep: 'Step',
    nodeHeight: 'Node height',
    nodeWidth: 'Node width',
    nodeSpacing: 'Node spacing',
    searchPeople: 'Search people',
    searchSuggestions: 'Search suggestions',
    clearSearch: 'Clear search',
    resizeEditor: 'Resize editor',
    viewMode: 'View mode',
    import: 'Import',
    export: 'Export',
    shareTree: 'Share tree',
    shareLinkPrompt: 'Copy this share link',
    sharedPreviewTitle: 'Shared preview',
    sharedPreviewDescription: 'This shared tree is read-only until you save it as a new tree or replace your current tree.',
    sharedTreeName: 'Name for this shared tree',
    saveSharedTreeAsNew: 'Save as new tree',
    replaceCurrentTree: 'Replace current tree',
    confirmReplaceCurrentTree: (name) => `Replace "${name}" with this shared tree?`,
    discardSharedPreview: 'Discard preview',
    toggleSplitView: 'Toggle split view',
    splitGraphView: 'Split graph view',
    closeSplitGraphView: 'Close split graph view',
    compactDsl: 'Compact DSL',
    dslHelp: 'Show DSL legend',
    dslLegendTitle: 'Compact DSL legend',
    dslLegendIntro: 'Use short text lines to define people and parent-child relationships.',
    dslLegendPersonLine: 'Person: <id>:<name>,g=m,b=1950,d=2020,n=note',
    dslLegendRelationshipLine: 'Parents with children: father+mother->child1,child2',
    dslLegendMarriageLine: 'Marriage without children: personA+personB',
    dslLegendSingleParentLine: 'Single parent: parent->child1,child2',
    dslLegendAliases: 'Aliases: g=m/f/o/u, b=birth year, d=death year, n=note.',
    dslLegendSpacing: 'Spaces around :, +, ->, and , are allowed. Children stay in listed order when birth years are missing.',
    dslLegendExample: 'Example',
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
    died: 'Died',
    note: 'Note',
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
    familyTree: 'Gia phả',
    createFamilyTree: 'Tạo gia phả mới...',
    renameFamilyTree: 'Đổi tên gia phả',
    deleteFamilyTree: 'Xoá gia phả',
    newFamilyTreeName: 'Tên gia phả mới',
    renameFamilyTreeName: 'Đổi tên gia phả',
    confirmDeleteFamilyTree: (name) => `Xoá "${name}"? Không thể hoàn tác.`,
    graphSettings: 'Cài đặt đồ thị',
    connectionStyle: 'Kiểu đường nối',
    connectionCurve: 'Đường cong',
    connectionSmoothStep: 'Bo góc',
    connectionStraight: 'Đường thẳng',
    connectionStep: 'Gấp khúc',
    nodeHeight: 'Chiều cao nút',
    nodeWidth: 'Độ rộng nút',
    nodeSpacing: 'Khoảng cách nút',
    searchPeople: 'Tìm người',
    searchSuggestions: 'Gợi ý tìm kiếm',
    clearSearch: 'Xoá tìm kiếm',
    resizeEditor: 'Đổi kích thước trình soạn thảo',
    viewMode: 'Chế độ xem',
    import: 'Nhập',
    export: 'Xuất',
    shareTree: 'Chia sẻ gia phả',
    shareLinkPrompt: 'Sao chép liên kết chia sẻ này',
    sharedPreviewTitle: 'Bản xem trước được chia sẻ',
    sharedPreviewDescription: 'Gia phả được chia sẻ chỉ xem được cho đến khi bạn lưu thành gia phả mới hoặc thay thế gia phả hiện tại.',
    sharedTreeName: 'Tên cho gia phả được chia sẻ',
    saveSharedTreeAsNew: 'Lưu thành gia phả mới',
    replaceCurrentTree: 'Thay thế gia phả hiện tại',
    confirmReplaceCurrentTree: (name) => `Thay thế "${name}" bằng gia phả được chia sẻ này?`,
    discardSharedPreview: 'Bỏ bản xem trước',
    toggleSplitView: 'Bật/tắt chia đôi',
    splitGraphView: 'Chia đôi đồ thị',
    closeSplitGraphView: 'Đóng đồ thị thứ hai',
    compactDsl: 'DSL rút gọn',
    dslHelp: 'Hiện chú giải DSL',
    dslLegendTitle: 'Chú giải DSL rút gọn',
    dslLegendIntro: 'Dùng các dòng văn bản ngắn để khai báo người và quan hệ bố/mẹ-con.',
    dslLegendPersonLine: 'Người: <mã>:<tên>,g=m,b=1950,d=2020,n=ghi chú',
    dslLegendRelationshipLine: 'Bố mẹ và con: bố+mẹ->con1,con2',
    dslLegendMarriageLine: 'Kết hôn chưa có con: ngườiA+ngườiB',
    dslLegendSingleParentLine: 'Bố/mẹ đơn thân: bố_mẹ->con1,con2',
    dslLegendAliases: 'Viết tắt: g=m/f/o/u, b=năm sinh, d=năm mất, n=ghi chú.',
    dslLegendSpacing: 'Có thể thêm khoảng trắng quanh :, +, ->, và ,. Nếu thiếu năm sinh, thứ tự con theo dòng quan hệ.',
    dslLegendExample: 'Ví dụ',
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
    died: 'Năm mất',
    note: 'Ghi chú',
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
