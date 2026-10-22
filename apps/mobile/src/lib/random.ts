import { setRandomSource } from '@sehari/core';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/** Di Hermes tidak ada crypto.getRandomValues bawaan — arahkan ke expo-crypto. */
if (Platform.OS !== 'web') {
  setRandomSource((out) => {
    Crypto.getRandomValues(out);
  });
}
