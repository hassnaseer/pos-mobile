import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSearchStore } from '../store/searchStore';

/**
 * Auto-resets the global search query whenever the screen is focused.
 * 
 * @param {boolean} [autoClear=true] - Set to false if you don't want this screen
 * to automatically clear the search state on focus.
 */
export const useResetSearchOnFocus = (autoClear = true) => {
  const isFocused = useIsFocused();
  const clearSearch = useSearchStore(state => state.clearSearch);

  useEffect(() => {
    if (isFocused && autoClear) {
      clearSearch();
    }
  }, [isFocused, autoClear]);
};
