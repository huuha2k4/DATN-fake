export {};

declare module 'react-native' {
  namespace StyleSheet {
    export const absoluteFillObject: {
      position: 'absolute';
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
    };
  }

  interface StatusBarProps {
    backgroundColor?: any;
  }

  interface PressableProps {
    activeOpacity?: any;
  }
}
