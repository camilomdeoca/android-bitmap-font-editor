import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { create } from 'zustand';

type KeyboardState = {
  keyboardHeight: number;
};

type KeyboardActions = {
  setKeyboardHeight: (height: number) => void;
  initializeKeyboardListeners: () => { showListener: any; hideListener: any } | undefined;
};

const useKeyboardStore = create<KeyboardState & KeyboardActions>((set, get) => ({
  keyboardHeight: Keyboard.metrics()?.height ?? 0,
  
  setKeyboardHeight: (height: number) => {
    set({ keyboardHeight: height });
  },
  
  initializeKeyboardListeners: () => {
    const { setKeyboardHeight } = get();
    
    const showListener = Keyboard.addListener("keyboardDidShow", (ev) => {
      setKeyboardHeight(ev.endCoordinates.height);
    });
    
    const hideListener = Keyboard.addListener("keyboardDidHide", (ev) => {
      setKeyboardHeight(ev.endCoordinates.height);
    });
    
    return { showListener, hideListener };
  },
}));

let listenerCount = 0;
let storedListeners: { showListener: any; hideListener: any } | undefined;

export function useKeyboardHeight(): number {
  const keyboardHeight = useKeyboardStore(state => state.keyboardHeight);
  const initializeKeyboardListeners = useKeyboardStore(state => state.initializeKeyboardListeners);
  
  useEffect(() => {
    listenerCount++;
    
    // Initialize listeners only when first component mounts
    if (listenerCount === 1) {
      storedListeners = initializeKeyboardListeners();
    }
    
    return () => {
      listenerCount--;
      
      // Cleanup listeners when last component unmounts
      if (listenerCount === 0 && storedListeners) {
        storedListeners.showListener.remove();
        storedListeners.hideListener.remove();
        storedListeners = undefined;
      }
    };
  }, [initializeKeyboardListeners]);
  
  return keyboardHeight;
}
