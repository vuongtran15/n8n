/** Cách build paramObject cho POST /sap-auto/command */
export type SapCommandParamKind =
	| 'none'
	| 'elementId'
	| 'elementIdAndText'
	| 'elementIdAndCaret'
	| 'elementIdAndCheckbox'
	| 'elementIdAndComboKey'
	| 'elementIdAndComboText'
	| 'setTexts'
	| 'setCheckboxes'
	| 'virtualKey'
	| 'transactionCode'
	| 'selectTab'
	| 'toolbarButton'
	| 'shellButton'
	| 'containerIdOnly'
	| 'scrollPage'
	| 'tooltip'
	| 'containsText'
	| 'handlePopup'
	| 'waitElement'
	| 'waitSap'
	| 'sleep'
	| 'gridIdOnly'
	| 'gridCellRead'
	| 'gridCellWrite'
	| 'gridRowOnly'
	| 'gridRowColumn'
	| 'gridToolbarButton'
	| 'gridPage'
	| 'tableIdOnly'
	| 'tableCellRead'
	| 'tableCellWrite'
	| 'tableRowScroll'
	| 'treeItem'
	| 'treeNode'
	| 'treeIdOnly'
	| 'savePath'
	| 'gridSavePath'
	| 'savePathAndFileType'
	| 'dumpUserArea'
	| 'idPattern'
	| 'fillMultipleSelection'
	| 'openFillMultipleSelection';

export interface SapCommandDefinition {
	operation: string;
	function: string;
	displayName: string;
	description: string;
	action: string;
	params: SapCommandParamKind;
}

/** Một nguồn cho operation → ISapConnector function (HTTP reflection). */
export const SAP_COMMAND_DEFINITIONS: SapCommandDefinition[] = [
	// Phiên
	{ operation: 'connect', function: 'Connect', displayName: 'Connect', description: 'Connect()', action: 'Connect session', params: 'none' },
	{ operation: 'reconnect', function: 'Reconnect', displayName: 'Reconnect', description: 'Reconnect()', action: 'Reconnect session', params: 'none' },
	{ operation: 'isSessionAlive', function: 'IsSessionAlive', displayName: 'Is Session Alive', description: 'IsSessionAlive()', action: 'Check session alive', params: 'none' },
	// Element / nhập liệu
	{ operation: 'exists', function: 'Exists', displayName: 'Exists', description: 'Exists(id)', action: 'Check element exists', params: 'elementId' },
	{ operation: 'findIds', function: 'FindIds', displayName: 'Find Ids', description: 'FindIds(idPattern)', action: 'Find element ids by pattern', params: 'idPattern' },
	{ operation: 'setText', function: 'SetText', displayName: 'Set Text', description: 'SetText(id, value)', action: 'Set text', params: 'elementIdAndText' },
	{ operation: 'setTexts', function: 'SetTexts', displayName: 'Set Texts (many)', description: 'SetTexts(items)', action: 'Set many texts', params: 'setTexts' },
	{ operation: 'getText', function: 'GetText', displayName: 'Get Text', description: 'GetText(id)', action: 'Get text', params: 'elementId' },
	{ operation: 'clear', function: 'Clear', displayName: 'Clear', description: 'Clear(id)', action: 'Clear field', params: 'elementId' },
	{ operation: 'setTextAndEnter', function: 'SetTextAndEnter', displayName: 'Set Text And Enter', description: 'SetTextAndEnter(id, value)', action: 'Set text and enter', params: 'elementIdAndText' },
	{ operation: 'setFocus', function: 'SetFocus', displayName: 'Set Focus', description: 'SetFocus(id)', action: 'Set focus', params: 'elementId' },
	{ operation: 'getCaretPosition', function: 'GetCaretPosition', displayName: 'Get Caret Position', description: 'GetCaretPosition(id)', action: 'Get caret position', params: 'elementId' },
	{ operation: 'setCaretPosition', function: 'SetCaretPosition', displayName: 'Set Caret Position', description: 'SetCaretPosition(id, position)', action: 'Set caret position', params: 'elementIdAndCaret' },
	// Hành động
	{ operation: 'click', function: 'Click', displayName: 'Click', description: 'Click(id)', action: 'Click', params: 'elementId' },
	{ operation: 'doubleClick', function: 'DoubleClick', displayName: 'Double Click', description: 'DoubleClick(id)', action: 'Double-click element', params: 'elementId' },
	{ operation: 'clickByTooltip', function: 'ClickByTooltip', displayName: 'Click By Tooltip', description: 'ClickByTooltip(tooltip)', action: 'Click by tooltip', params: 'tooltip' },
	{ operation: 'sendEnter', function: 'SendEnter', displayName: 'Send Enter', description: 'SendEnter()', action: 'Send Enter', params: 'none' },
	{ operation: 'sendVKey', function: 'SendVKey', displayName: 'Send Virtual Key', description: 'SendVKey(vKey)', action: 'Send VKey', params: 'virtualKey' },
	{ operation: 'pressToolbarButton', function: 'PressToolbarButton', displayName: 'Press Toolbar Button', description: 'PressToolbarButton(toolbarId, buttonIndex)', action: 'Press toolbar button', params: 'toolbarButton' },
	{ operation: 'pressShellButton', function: 'PressShellButton', displayName: 'Press Shell Button', description: 'PressShellButton(shellId, buttonId)', action: 'Press shell button', params: 'shellButton' },
	{ operation: 'scrollPage', function: 'ScrollPage', displayName: 'Scroll Page', description: 'ScrollPage(containerId, position?)', action: 'Scroll page (vertical scrollbar)', params: 'scrollPage' },
	{ operation: 'resetScroll', function: 'ResetScroll', displayName: 'Reset Scroll', description: 'ResetScroll(containerId)', action: 'Reset vertical scrollbar to top', params: 'containerIdOnly' },
	// Checkbox / radio
	{ operation: 'setCheckbox', function: 'SetCheckbox', displayName: 'Set Checkbox', description: 'SetCheckbox(id, value)', action: 'Set checkbox', params: 'elementIdAndCheckbox' },
	{ operation: 'setCheckboxes', function: 'SetCheckboxes', displayName: 'Set Checkboxes (many)', description: 'SetCheckboxes(items)', action: 'Set many checkboxes', params: 'setCheckboxes' },
	{ operation: 'getCheckbox', function: 'GetCheckbox', displayName: 'Get Checkbox', description: 'GetCheckbox(id)', action: 'Get checkbox', params: 'elementId' },
	{ operation: 'selectRadio', function: 'SelectRadio', displayName: 'Select Radio', description: 'SelectRadio(id)', action: 'Select radio', params: 'elementId' },
	// Combo
	{ operation: 'selectByKey', function: 'SelectByKey', displayName: 'Select By Key', description: 'SelectByKey(id, key)', action: 'Select combo by key', params: 'elementIdAndComboKey' },
	{ operation: 'selectByText', function: 'SelectByText', displayName: 'Select By Text', description: 'SelectByText(id, text)', action: 'Select combo by text', params: 'elementIdAndComboText' },
	{ operation: 'getSelectedKey', function: 'GetSelectedKey', displayName: 'Get Selected Key', description: 'GetSelectedKey(id)', action: 'Get selected key', params: 'elementId' },
	{ operation: 'getSelectedText', function: 'GetSelectedText', displayName: 'Get Selected Text', description: 'GetSelectedText(id)', action: 'Get selected text', params: 'elementId' },
	{ operation: 'getOptions', function: 'GetOptions', displayName: 'Get Options', description: 'GetOptions(id)', action: 'Get combo options', params: 'elementId' },
	// Điều hướng
	{ operation: 'executeTCode', function: 'ExecuteTCode', displayName: 'Execute T-Code', description: 'ExecuteTCode(tcode)', action: 'Execute T-code', params: 'transactionCode' },
	{ operation: 'selectTab', function: 'SelectTab', displayName: 'Select Tab', description: 'SelectTab(tabStripId, tabId) — tabStripId có thể "" khi tabId là path đầy đủ', action: 'Select tab', params: 'selectTab' },
	{ operation: 'resetToMainMenu', function: 'ResetToMainMenu', displayName: 'Reset To Main Menu', description: 'ResetToMainMenu()', action: 'Reset to main menu', params: 'none' },
	{ operation: 'goBack', function: 'GoBack', displayName: 'Go Back', description: 'GoBack()', action: 'Go back', params: 'none' },
	{ operation: 'openNewSession', function: 'OpenNewSession', displayName: 'Open New Session', description: 'OpenNewSession()', action: 'Open new session', params: 'none' },
	// Grid ALV
	{ operation: 'getAllRows', function: 'GetAllRows', displayName: 'Grid — Get All Rows', description: 'GetAllRows(gridId)', action: 'Get all grid rows', params: 'gridIdOnly' },
	{ operation: 'getGridCellValue', function: 'GetCellValue', displayName: 'Grid — Get Cell', description: 'GetCellValue(gridId, row, columnName)', action: 'Get grid cell', params: 'gridCellRead' },
	{ operation: 'setGridCellValue', function: 'SetCellValue', displayName: 'Grid — Set Cell', description: 'SetCellValue(gridId, row, columnName, value)', action: 'Set grid cell', params: 'gridCellWrite' },
	{ operation: 'getGridRowCount', function: 'GetRowCount', displayName: 'Grid — Get Row Count', description: 'GetRowCount(gridId)', action: 'Get grid row count', params: 'gridIdOnly' },
	{ operation: 'getColumnNames', function: 'GetColumnNames', displayName: 'Grid — Get Column Names', description: 'GetColumnNames(gridId)', action: 'Get grid column names', params: 'gridIdOnly' },
	{ operation: 'getColumnHeaders', function: 'GetColumnHeaders', displayName: 'Grid — Get Column Headers', description: 'GetColumnHeaders(gridId)', action: 'Get grid column headers', params: 'gridIdOnly' },
	{ operation: 'getAllRowsWithHeaders', function: 'GetAllRowsWithHeaders', displayName: 'Grid — Get Rows With Headers', description: 'GetAllRowsWithHeaders(gridId)', action: 'Get grid rows with headers', params: 'gridIdOnly' },
	{ operation: 'selectRow', function: 'SelectRow', displayName: 'Grid — Select Row', description: 'SelectRow(gridId, row)', action: 'Select grid row', params: 'gridRowOnly' },
	{ operation: 'clickCurrentCell', function: 'ClickCurrentCell', displayName: 'Grid — Click Cell', description: 'ClickCurrentCell(gridId, row, columnName)', action: 'Click grid cell', params: 'gridRowColumn' },
	{ operation: 'doubleClickRow', function: 'DoubleClickRow', displayName: 'Grid — Double-Click Row', description: 'DoubleClickRow(gridId, row, columnName)', action: 'Double-click grid row', params: 'gridRowColumn' },
	{ operation: 'scrollGridToRow', function: 'ScrollToRow', displayName: 'Grid — Scroll To Row', description: 'ScrollToRow(gridId, row)', action: 'Scroll grid to row', params: 'gridRowOnly' },
	{ operation: 'pressGridToolbarButton', function: 'PressGridToolbarButton', displayName: 'Grid — Press Toolbar Button', description: 'PressGridToolbarButton(gridId, buttonId)', action: 'Press grid toolbar button', params: 'gridToolbarButton' },
	{ operation: 'getGridAsDataTable', function: 'GetGridAsDataTable', displayName: 'Grid — Get As DataTable', description: 'GetGridAsDataTable(gridId)', action: 'Get grid as data table', params: 'gridIdOnly' },
	{ operation: 'getGridPage', function: 'GetGridPage', displayName: 'Grid — Get Page', description: 'GetGridPage(gridId, pageIndex, pageSize?)', action: 'Get grid page', params: 'gridPage' },
	{ operation: 'exportGridToExcel', function: 'ExportGridToExcel', displayName: 'Grid — Export Excel', description: 'ExportGridToExcel(gridId, savePath)', action: 'Export grid to Excel', params: 'gridSavePath' },
	{ operation: 'exportGridToText', function: 'ExportGridToText', displayName: 'Grid — Export Text', description: 'ExportGridToText(gridId, savePath)', action: 'Export grid to text', params: 'gridSavePath' },
	// Table
	{ operation: 'getTableRows', function: 'GetTableRows', displayName: 'Table — Get Rows', description: 'GetTableRows(tableId)', action: 'Get table rows', params: 'tableIdOnly' },
	{ operation: 'getTableCellValue', function: 'GetCellValue', displayName: 'Table — Get Cell', description: 'GetCellValue(tableId, row, col)', action: 'Get table cell', params: 'tableCellRead' },
	{ operation: 'setTableCellValue', function: 'SetCellValue', displayName: 'Table — Set Cell', description: 'SetCellValue(tableId, row, col, value)', action: 'Set table cell', params: 'tableCellWrite' },
	{ operation: 'scrollTableToRow', function: 'ScrollToRow', displayName: 'Table — Scroll To Row', description: 'ScrollToRow(tableId, row) — overload table', action: 'Scroll table to row', params: 'tableRowScroll' },
	// Multiple Selection (SAPLALDB popup)
	{
		operation: 'fillMultipleSelectionValues',
		function: 'FillMultipleSelectionValues',
		displayName: 'Multi Sel — Fill (Popup Open)',
		description: 'FillMultipleSelectionValues(cellIdBase, items, ...) — popup đã mở sẵn',
		action: 'Fill multiple selection (popup open)',
		params: 'fillMultipleSelection',
	},
	{
		operation: 'openAndFillMultipleSelectionValues',
		function: 'OpenAndFillMultipleSelectionValues',
		displayName: 'Multi Sel — Open, Fill & Confirm',
		description: 'OpenAndFillMultipleSelectionValues(openButtonId, cellIdBase, items, ...)',
		action: 'Open and fill multiple selection',
		params: 'openFillMultipleSelection',
	},
	// Tree (GuiTree / shell tree)
	{ operation: 'selectTreeNode', function: 'SelectTreeNode', displayName: 'Tree — Select Node', description: 'SelectTreeNode(treeId, nodeKey) — recorder selectedNode', action: 'Select tree node', params: 'treeNode' },
	{ operation: 'getTreeSelectedNode', function: 'GetTreeSelectedNode', displayName: 'Tree — Get Selected Node', description: 'GetTreeSelectedNode(treeId)', action: 'Get selected tree node', params: 'treeIdOnly' },
	{ operation: 'selectTreeItem', function: 'SelectTreeItem', displayName: 'Tree — Select Item', description: 'SelectTreeItem(treeId, nodeKey, columnName)', action: 'Select tree item', params: 'treeItem' },
	{ operation: 'ensureTreeItemVisible', function: 'EnsureTreeItemVisible', displayName: 'Tree — Ensure Visible', description: 'EnsureTreeItemVisible(treeId, nodeKey, columnName)', action: 'Ensure tree item visible', params: 'treeItem' },
	{ operation: 'doubleClickTreeItem', function: 'DoubleClickTreeItem', displayName: 'Tree — Double-Click Item', description: 'DoubleClickTreeItem(treeId, nodeKey, columnName)', action: 'Double-click tree item', params: 'treeItem' },
	{ operation: 'getTreeItemText', function: 'GetTreeItemText', displayName: 'Tree — Get Item Text', description: 'GetTreeItemText(treeId, nodeKey, columnName)', action: 'Get tree item text', params: 'treeItem' },
	// Chờ
	{ operation: 'waitForElement', function: 'WaitForElement', displayName: 'Wait For Element', description: 'WaitForElement(id, timeoutSeconds?)', action: 'Wait for element', params: 'waitElement' },
	{ operation: 'waitUntilGone', function: 'WaitUntilGone', displayName: 'Wait Until Gone', description: 'WaitUntilGone(id, timeoutSeconds?)', action: 'Wait until gone', params: 'waitElement' },
	{ operation: 'waitForSap', function: 'WaitForSap', displayName: 'Wait For SAP', description: 'WaitForSap(timeoutSeconds?)', action: 'Wait for SAP', params: 'waitSap' },
	{ operation: 'sleep', function: 'Sleep', displayName: 'Sleep', description: 'Sleep(milliseconds)', action: 'Sleep', params: 'sleep' },
	// Popup
	{ operation: 'isPopupOpen', function: 'IsPopupOpen', displayName: 'Popup — Is Open', description: 'IsPopupOpen()', action: 'Is popup open', params: 'none' },
	{ operation: 'getPopupTitle', function: 'GetPopupTitle', displayName: 'Popup — Get Title', description: 'GetPopupTitle()', action: 'Get popup title', params: 'none' },
	{ operation: 'getPopupMessage', function: 'GetPopupMessage', displayName: 'Popup — Get Message', description: 'GetPopupMessage()', action: 'Get popup message', params: 'none' },
	{ operation: 'handlePopup', function: 'HandlePopup', displayName: 'Popup — Handle', description: 'HandlePopup(action)', action: 'Handle popup', params: 'handlePopup' },
	{ operation: 'confirmPopup', function: 'ConfirmPopup', displayName: 'Popup — Confirm', description: 'ConfirmPopup()', action: 'Confirm popup', params: 'none' },
	{ operation: 'cancelPopup', function: 'CancelPopup', displayName: 'Popup — Cancel', description: 'CancelPopup()', action: 'Cancel popup', params: 'none' },
	{ operation: 'continuePopup', function: 'ContinuePopup', displayName: 'Popup — Continue', description: 'ContinuePopup()', action: 'Continue popup', params: 'none' },
	// Status bar
	{ operation: 'getStatusText', function: 'GetStatusText', displayName: 'Get Status Text', description: 'GetStatusText()', action: 'Get status text', params: 'none' },
	{ operation: 'getStatusType', function: 'GetStatusType', displayName: 'Get Status Type', description: 'GetStatusType()', action: 'Get status type', params: 'none' },
	{ operation: 'hasError', function: 'HasError', displayName: 'Has Error', description: 'HasError()', action: 'Has status error', params: 'none' },
	{ operation: 'isSuccess', function: 'IsSuccess', displayName: 'Is Success', description: 'IsSuccess()', action: 'Is status success', params: 'none' },
	{ operation: 'throwIfError', function: 'ThrowIfError', displayName: 'Throw If Error', description: 'ThrowIfError()', action: 'Throw if status error', params: 'none' },
	// Export / file
	{ operation: 'handleSaveFileDialog', function: 'HandleSaveFileDialog', displayName: 'Handle Save File Dialog', description: 'HandleSaveFileDialog(savePath)', action: 'Handle save file dialog', params: 'savePath' },
	{ operation: 'selectLocalFileExport', function: 'SelectLocalFileExport', displayName: 'Select Local File Export', description: 'SelectLocalFileExport(savePath, fileType?)', action: 'Select local file export', params: 'savePathAndFileType' },
	// Debug
	{ operation: 'containsText', function: 'ContainsText', displayName: 'Contains Text', description: 'ContainsText(text)', action: 'Contains text', params: 'containsText' },
	{ operation: 'captureScreen', function: 'CaptureScreen', displayName: 'Capture Screen', description: 'CaptureScreen(savePath)', action: 'Capture screen', params: 'savePath' },
	{ operation: 'getWindowTitle', function: 'GetWindowTitle', displayName: 'Get Window Title', description: 'GetWindowTitle()', action: 'Get window title', params: 'none' },
	{ operation: 'getCurrentTCode', function: 'GetCurrentTCode', displayName: 'Get Current T-Code', description: 'GetCurrentTCode()', action: 'Get current T-code', params: 'none' },
	{ operation: 'dumpElementTree', function: 'DumpElementTree', displayName: 'Dump Element Tree', description: 'DumpElementTree()', action: 'Dump element tree', params: 'none' },
	{ operation: 'dumpElementTreeBasic', function: 'DumpElementTreeBasic', displayName: 'Dump Element Tree Basic', description: 'DumpElementTreeBasic()', action: 'Dump element tree basic', params: 'none' },
	{ operation: 'dumpUserAreaTexts', function: 'DumpUserAreaTexts', displayName: 'Dump User Area Texts', description: 'DumpUserAreaTexts(userAreaId?)', action: 'Dump user area texts', params: 'dumpUserArea' },
];

export const SAP_COMMAND_FUNCTION: Record<string, string> = Object.fromEntries(
	SAP_COMMAND_DEFINITIONS.map((d) => [d.operation, d.function]),
);

export const SAP_COMMAND_PARAM_KIND: Record<string, SapCommandParamKind> = Object.fromEntries(
	SAP_COMMAND_DEFINITIONS.map((d) => [d.operation, d.params]),
);

/** Gom operation theo param kind (cho displayOptions field). */
export function operationsWithParamKind(...kinds: SapCommandParamKind[]): string[] {
	return SAP_COMMAND_DEFINITIONS.filter((d) => kinds.includes(d.params)).map((d) => d.operation);
}
