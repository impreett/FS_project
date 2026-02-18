declare global {
	interface Window {
		__env?: { API_BASE?: string };
	}
}

const DEFAULT_API = 'https://fs-project-6fl1.onrender.com/api';
const LOCAL_API = 'http://localhost:5000/api';

const runtimeApi = (typeof window !== 'undefined' && (window as any).__env && (window as any).__env.API_BASE)
	? (window as any).__env.API_BASE as string
	: undefined;

export const API_BASE = runtimeApi || (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? LOCAL_API : DEFAULT_API);
