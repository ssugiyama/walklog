import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// @googlemaps/jest-mocks references the global `jest` API directly;
// vi's mock API is a drop-in replacement.
;(globalThis as unknown as { jest: typeof vi }).jest = vi
