import { ref, type Ref } from 'vue';

const DEFAULT_TITLE = 'n8n';
const DEFAULT_TAGLINE = 'Workflow Automation';

export type WorkflowTitleStatus =
	| 'EXECUTING'
	| 'IDLE'
	| 'ERROR'
	| 'DEBUG'
	| 'AI_BUILDING'
	| 'AI_DONE';

export interface UseDocumentTitleOptions {
	/**
	 * Application name shown in the browser tab suffix.
	 * Defaults to `DEFAULT_TITLE` when omitted.
	 */
	appName?: string;
	/**
	 * The release channel (e.g., 'stable', 'beta', 'dev').
	 * If not provided or 'stable', the title suffix is the app name only.
	 * Otherwise, it will be '{appName}[CHANNEL]'.
	 */
	releaseChannel?: string;
	/**
	 * Optional window reference for setting the document title.
	 * Useful for pop-out windows.
	 */
	windowRef?: Ref<Window | undefined>;
}

export function useDocumentTitle(options: UseDocumentTitleOptions = {}) {
	const { releaseChannel, windowRef, appName = DEFAULT_TITLE } = options;
	const suffix =
		!releaseChannel || releaseChannel === 'stable'
			? appName
			: `${appName}[${releaseChannel.toUpperCase()}]`;

	const currentState = ref<WorkflowTitleStatus | undefined>(undefined);

	const set = (title: string) => {
		const sections = [title || DEFAULT_TAGLINE, suffix];
		(windowRef?.value?.document ?? document).title = sections.join(' - ');
	};

	const reset = () => {
		currentState.value = undefined;
		set('');
	};

	const setDocumentTitle = (workflowName: string, status: WorkflowTitleStatus) => {
		currentState.value = status;
		let prefix = '⚠️';
		if (status === 'EXECUTING') {
			prefix = '🔄';
		} else if (status === 'IDLE') {
			prefix = '▶️';
		} else if (status === 'AI_BUILDING') {
			prefix = '[Building]';
		} else if (status === 'AI_DONE') {
			prefix = '[Done]';
		}
		set(`${prefix} ${workflowName}`);
	};

	const getDocumentState = () => currentState.value;

	return { set, reset, setDocumentTitle, getDocumentState };
}
