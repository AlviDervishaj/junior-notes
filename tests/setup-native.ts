import * as matchers from '@testing-library/react-native/matchers';

// RNTL v14 does not auto-register its matchers, so `toBeOnTheScreen` and
// friends have to be extended onto expect explicitly.
expect.extend(matchers);
