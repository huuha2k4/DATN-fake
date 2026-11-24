import React from 'react';
import { StatusBar as RNStatusBar, StatusBarProps } from 'react-native';

export interface AppStatusBarProps extends Omit<StatusBarProps, 'backgroundColor'> {
  backgroundColor?: string;
}

export function AppStatusBar(props: AppStatusBarProps) {
  return <RNStatusBar {...(props as any)} />;
}

export default AppStatusBar;
