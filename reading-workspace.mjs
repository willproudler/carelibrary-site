// Keep the visible reader and its closeable workspace tab in agreement.
export function reconcileReadings(opened, current, reading = true) {
  const keys = [...new Set(opened)];
  if (reading && current && !keys.includes(current)) keys.push(current);
  return keys;
}

export function closeReading(opened, closing, current, fallbackBook = '') {
  const remaining = opened.filter(key => key !== closing);
  if (closing !== current) return {opened:remaining, destination:current};
  const destination = remaining.at(-1) || fallbackBook;
  return {opened:reconcileReadings(remaining, destination), destination};
}

export function standaloneBookState(workId, saved = {}) {
  const {connectionId, connectionReferenceId, connectionRouteMode, connectionSelection,
    connectionBooks, ...book} = saved;
  return {...book, workId, connectionId:'', connectionReferenceId:'', connectionSelection:null};
}

export const READING_STYLES = {
  work:{label:'Book',color:'#5faaa0',icon:''},
  lateral:{label:'Lateral',color:'#b294c9',icon:'<circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="m7 7 3 3m4 4 3 3m0-10-3 3m-4 4-3 3"/>'},
  corpus:{label:'Corpus',color:'#c8a46b',icon:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'},
  dialogue:{label:'Dialogue',color:'#79bdc7',icon:'<path d="M4 4h12v9H9l-4 3v-3H4z"/><path d="M9 16v2h7l4 3V9h-2"/>'}
};
