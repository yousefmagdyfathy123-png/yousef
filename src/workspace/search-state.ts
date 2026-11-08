export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export function searchStatusMessage(status: SearchStatus): string {
  switch (status) {
    case 'idle': return 'Enter a component name or standard.';
    case 'loading': return 'Searching…';
    case 'success': return 'Search results ready.';
    case 'empty': return 'No results found. Try a component name or standard.';
    case 'error': return 'Search could not be completed. Please try again.';
  }
}
