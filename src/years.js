
import { writable } from 'svelte/store';

// initial state can be null or full timeline
export const selectedYearsStore = writable({
    startDate: null,
    endDate: null
});