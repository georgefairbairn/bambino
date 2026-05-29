import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Live iOS accessibility preferences. Listens for changes so toggling
 * VoiceOver or Reduce Motion in Settings reconfigures the UI without an
 * app restart.
 *
 * `needsButtons` is true when the swipe gesture would conflict with
 * VoiceOver navigation OR when the user prefers reduced motion — in
 * either case, we render explicit Pass/Like buttons and disable the
 * pan gesture.
 */
export function useA11yPreferences() {
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setScreenReader(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });

    const srSub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const rmSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      srSub.remove();
      rmSub.remove();
    };
  }, []);

  return {
    screenReader,
    reduceMotion,
    needsButtons: screenReader || reduceMotion,
  };
}
