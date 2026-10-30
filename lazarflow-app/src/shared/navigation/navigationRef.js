import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Shared navigation reference so code outside the React tree (push
 * notification handlers, deep links) can navigate. Lives in its own module
 * to avoid a circular import with App.js (App renders the navigator, the
 * navigator wires the handlers, the handlers need this ref).
 */
export const navigationRef = createNavigationContainerRef();
